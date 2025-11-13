'use client'

/**
 * Remotion 视频预览页面
 * 支持上传 JSON 文件并实时预览视频合成效果
 */

import { useState, useMemo } from 'react'
import { Player } from '@remotion/player'
import { MainVideo } from '@/components/remotion/MainVideo'
import { ProjectData } from '@/components/remotion/types'
import {
  validateProjectData,
  getElements,
  getAssetsMap,
  getTotalDurationFrames,
  getVideoDimensions,
  getFps,
} from '@/lib/remotion/data-parser'
import { Button } from '@/components/atoms/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card'
import { Alert, AlertDescription } from '@/components/atoms/alert'
import { Upload, Play, Download } from 'lucide-react'

export default function RemotionPreviewPage() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // 解析视频配置
  const videoConfig = useMemo(() => {
    if (!projectData) return null

    const elements = getElements(projectData)
    const assets = getAssetsMap(projectData)
    const fps = getFps(projectData)
    const durationInFrames = getTotalDurationFrames(elements, fps)
    const dimensions = getVideoDimensions(
      projectData.acceptAspectRatios[0],
      projectData.output
    )

    // 调试输出
    console.log(
      '解析的元素:',
      elements.map(elem => ({
        id: elem.id,
        type: elem.type,
        start: elem.start,
        length: elem.length,
        parent: elem.parent,
      }))
    )

    return {
      elements,
      assets,
      fps,
      durationInFrames,
      width: dimensions.width,
      height: dimensions.height,
    }
  }, [projectData])

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError('')

    const reader = new FileReader()
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string)

        // 验证 JSON 数据结构
        if (!validateProjectData(json)) {
          throw new Error('无效的 JSON 数据结构，请检查数据格式')
        }

        setProjectData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : '解析 JSON 失败')
        console.error('JSON 解析错误:', err)
      } finally {
        setIsLoading(false)
      }
    }

    reader.onerror = () => {
      setError('读取文件失败')
      setIsLoading(false)
    }

    reader.readAsText(file)
  }

  // 加载示例数据
  const loadExampleData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/project_data_simple.json')
      if (!response.ok) {
        throw new Error('Failed to load example data')
      }

      const data = await response.json()
      if (!validateProjectData(data)) {
        throw new Error('Invalid project data format')
      }

      setProjectData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // 加载复杂示例数据
  const loadComplexExampleData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/project_data.json')
      if (!response.ok) {
        throw new Error('Failed to load complex example data')
      }

      const data = await response.json()
      if (!validateProjectData(data)) {
        throw new Error('Invalid project data format')
      }

      setProjectData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* 页面标题 */}
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold'>Remotion 视频预览</h1>
        <p className='text-muted-foreground'>
          上传 project_data.json 文件或加载示例数据来预览视频合成效果
        </p>
      </div>

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle>导入数据</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-4'>
            {/* 文件上传按钮 */}
            <div className='flex-1'>
              <label htmlFor='file-upload' className='cursor-pointer'>
                <div className='flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-primary transition-colors'>
                  <div className='text-center space-y-2'>
                    <Upload className='mx-auto h-8 w-8 text-muted-foreground' />
                    <div className='text-sm'>
                      <span className='font-semibold text-primary'>
                        点击上传
                      </span>
                      <span className='text-muted-foreground'>
                        {' '}
                        或拖拽 JSON 文件
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  id='file-upload'
                  type='file'
                  accept='.json'
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className='hidden'
                />
              </label>
            </div>

            {/* 加载示例按钮 */}
            <div className='flex items-center'>
              <div className='space-y-2'>
                <Button
                  onClick={loadExampleData}
                  disabled={isLoading}
                  className='w-full'
                >
                  <Download className='w-4 h-4 mr-2' />
                  {isLoading ? '加载中...' : '加载简化示例'}
                </Button>
                <Button
                  onClick={loadComplexExampleData}
                  disabled={isLoading}
                  variant='outline'
                  className='w-full'
                >
                  <Download className='w-4 h-4 mr-2' />
                  {isLoading ? '加载中...' : '加载复杂示例'}
                </Button>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <Alert>
              <AlertDescription>正在处理数据...</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 视频预览区域 */}
      {projectData && videoConfig && (
        <Card>
          <CardHeader>
            <CardTitle>视频预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='aspect-video bg-black rounded-lg overflow-hidden'>
              <Player
                component={MainVideo}
                inputProps={{
                  elements: videoConfig.elements,
                  assets: videoConfig.assets,
                  width: videoConfig.width,
                  height: videoConfig.height,
                  fps: videoConfig.fps,
                }}
                durationInFrames={videoConfig.durationInFrames}
                fps={videoConfig.fps}
                compositionWidth={videoConfig.width}
                compositionHeight={videoConfig.height}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls
                autoPlay={false}
                loop
                numberOfSharedAudioTags={10}
              />
            </div>

            {/* 视频信息 */}
            <div className='mt-4 grid grid-cols-3 gap-4 text-sm'>
              <div>
                <span className='text-muted-foreground'>宽高比：</span>
                <span className='font-medium ml-2'>
                  {projectData.acceptAspectRatios?.[0] || '9x16'}
                </span>
              </div>
              <div>
                <span className='text-muted-foreground'>元素数量：</span>
                <span className='font-medium ml-2'>
                  {Object.keys(projectData.timeline.elements).length}
                </span>
              </div>
              <div>
                <span className='text-muted-foreground'>资产数量：</span>
                <span className='font-medium ml-2'>
                  {Object.keys(projectData.timeline.assets).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      {!projectData && (
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-muted-foreground'>
            <p>1. 准备包含视频配置的 project_data.json 文件</p>
            <p>2. 点击上传按钮选择文件，或加载示例数据</p>
            <p>3. 系统会自动解析并预览视频合成效果</p>
            <p>4. 使用播放器控制条调整播放进度、音量等</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
