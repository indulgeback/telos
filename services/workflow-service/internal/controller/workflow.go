package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/workflow-service/internal/middleware"
)

// WorkflowController 工作流控制器
type WorkflowController struct{}

// NewWorkflowController 创建工作流控制器实例
func NewWorkflowController() *WorkflowController {
	return &WorkflowController{}
}

// GetWorkflows 获取工作流列表
// GET /api/workflows
func (wc *WorkflowController) GetWorkflows(c *gin.Context) {
	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	// status和search变量将在实现数据库查询时使用
	// status := c.Query("status")
	// search := c.Query("search")

	// TODO: 从数据库查询工作流列表
	// workflows := workflowService.GetUserWorkflows(userID, page, limit, status, search)

	// 模拟工作流数据
	workflows := []gin.H{
		{
			"id":          "workflow_1",
			"name":        "数据处理工作流",
			"description": "自动处理用户上传的数据文件",
			"status":      "active",
			"version":     "1.0.0",
			"createdBy":   "user_123", // 使用固定值替代userID变量
			"createdAt":   time.Now().Add(-7 * 24 * time.Hour),
			"updatedAt":   time.Now().Add(-2 * time.Hour),
			"lastRunAt":   time.Now().Add(-30 * time.Minute),
			"runCount":    15,
			"successRate": 93.3,
			"tags":        []string{"数据处理", "自动化"},
		},
		{
			"id":          "workflow_2",
			"name":        "邮件通知工作流",
			"description": "定时发送系统状态邮件",
			"status":      "active",
			"version":     "2.1.0",
			"createdBy":   "user_123", // 使用固定值替代userID变量
			"createdAt":   time.Now().Add(-14 * 24 * time.Hour),
			"updatedAt":   time.Now().Add(-1 * 24 * time.Hour),
			"lastRunAt":   time.Now().Add(-1 * time.Hour),
			"runCount":    42,
			"successRate": 97.6,
			"tags":        []string{"通知", "定时任务"},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"workflows": workflows,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": len(workflows),
			},
		},
	})
}

// GetWorkflow 获取工作流详情
// GET /api/workflows/:id
func (wc *WorkflowController) GetWorkflow(c *gin.Context) {
	workflowID := c.Param("id")
	if workflowID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "工作流 ID 不能为空",
		})
		return
	}

	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// TODO: 从数据库查询工作流详情
	// workflow := workflowService.GetByID(workflowID, userID)

	// 模拟工作流详情数据
	workflow := gin.H{
		"id":          workflowID,
		"name":        "数据处理工作流",
		"description": "自动处理用户上传的数据文件",
		"status":      "active",
		"version":     "1.0.0",
		"createdBy":   "user_123", // 使用固定值替代userID变量
		"createdAt":   time.Now().Add(-7 * 24 * time.Hour),
		"updatedAt":   time.Now().Add(-2 * time.Hour),
		"definition": gin.H{
			"nodes": []gin.H{
				{
					"id":   "start",
					"type": "start",
					"name": "开始",
					"position": gin.H{
						"x": 100,
						"y": 100,
					},
				},
				{
					"id":   "process",
					"type": "process",
					"name": "数据处理",
					"config": gin.H{
						"script":  "process_data.py",
						"timeout": 300,
					},
					"position": gin.H{
						"x": 300,
						"y": 100,
					},
				},
				{
					"id":   "end",
					"type": "end",
					"name": "结束",
					"position": gin.H{
						"x": 500,
						"y": 100,
					},
				},
			},
			"edges": []gin.H{
				{
					"id":     "edge1",
					"source": "start",
					"target": "process",
				},
				{
					"id":     "edge2",
					"source": "process",
					"target": "end",
				},
			},
		},
		"triggers": []gin.H{
			{
				"type": "schedule",
				"config": gin.H{
					"cron": "0 */6 * * *",
				},
			},
		},
		"tags": []string{"数据处理", "自动化"},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"workflow": workflow,
		},
	})
}

// CreateWorkflow 创建工作流
// POST /api/workflows
func (wc *WorkflowController) CreateWorkflow(c *gin.Context) {
	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	var workflowData struct {
		Name        string   `json:"name" binding:"required"`
		Description string   `json:"description"`
		Definition  gin.H    `json:"definition" binding:"required"`
		Triggers    []gin.H  `json:"triggers"`
		Tags        []string `json:"tags"`
	}

	if err := c.ShouldBindJSON(&workflowData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求数据格式错误: " + err.Error(),
		})
		return
	}

	// TODO: 创建工作流到数据库
	// workflow := workflowService.Create(userID, workflowData)

	// 模拟创建的工作流
	workflow := gin.H{
		"id":          "workflow_new_" + strconv.FormatInt(time.Now().Unix(), 10),
		"name":        workflowData.Name,
		"description": workflowData.Description,
		"status":      "draft",
		"version":     "1.0.0",
		"createdBy":   "user_123", // 使用固定值替代userID变量
		"createdAt":   time.Now(),
		"updatedAt":   time.Now(),
		"definition":  workflowData.Definition,
		"triggers":    workflowData.Triggers,
		"tags":        workflowData.Tags,
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"workflow": workflow,
		},
		"message": "工作流创建成功",
	})
}

// UpdateWorkflow 更新工作流
// PUT /api/workflows/:id
func (wc *WorkflowController) UpdateWorkflow(c *gin.Context) {
	workflowID := c.Param("id")
	if workflowID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "工作流 ID 不能为空",
		})
		return
	}

	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	var updateData struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Definition  gin.H    `json:"definition"`
		Triggers    []gin.H  `json:"triggers"`
		Tags        []string `json:"tags"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求数据格式错误: " + err.Error(),
		})
		return
	}

	// TODO: 检查工作流所有权并更新
	// workflow := workflowService.Update(workflowID, userID, updateData)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"workflow": gin.H{
				"id":          workflowID,
				"name":        updateData.Name,
				"description": updateData.Description,
				"definition":  updateData.Definition,
				"triggers":    updateData.Triggers,
				"tags":        updateData.Tags,
				"updatedAt":   time.Now(),
			},
		},
		"message": "工作流更新成功",
	})
}

// DeleteWorkflow 删除工作流
// DELETE /api/workflows/:id
func (wc *WorkflowController) DeleteWorkflow(c *gin.Context) {
	workflowID := c.Param("id")
	if workflowID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "工作流 ID 不能为空",
		})
		return
	}

	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// TODO: 检查工作流所有权并删除
	// workflowService.Delete(workflowID, userID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "工作流删除成功",
	})
}

// RunWorkflow 执行工作流
// POST /api/workflows/:id/run
func (wc *WorkflowController) RunWorkflow(c *gin.Context) {
	workflowID := c.Param("id")
	if workflowID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "工作流 ID 不能为空",
		})
		return
	}

	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	var runData struct {
		Input gin.H `json:"input"`
	}

	if err := c.ShouldBindJSON(&runData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求数据格式错误: " + err.Error(),
		})
		return
	}

	// TODO: 执行工作流
	// execution := workflowService.Run(workflowID, userID, runData.Input)

	// 模拟执行结果
	execution := gin.H{
		"id":         "exec_" + strconv.FormatInt(time.Now().Unix(), 10),
		"workflowId": workflowID,
		"status":     "running",
		"startedAt":  time.Now(),
		"input":      runData.Input,
		"progress":   0,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"execution": execution,
		},
		"message": "工作流开始执行",
	})
}

// GetWorkflowExecutions 获取工作流执行历史
// GET /api/workflows/:id/executions
func (wc *WorkflowController) GetWorkflowExecutions(c *gin.Context) {
	workflowID := c.Param("id")
	if workflowID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "工作流 ID 不能为空",
		})
		return
	}

	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	// status变量将在实现数据库查询时使用
	// status := c.Query("status")

	// TODO: 从数据库查询执行历史
	// executions := workflowService.GetExecutions(workflowID, userID, page, limit, status)

	// 模拟执行历史数据
	executions := []gin.H{
		{
			"id":          "exec_1",
			"workflowId":  workflowID,
			"status":      "completed",
			"startedAt":   time.Now().Add(-2 * time.Hour),
			"completedAt": time.Now().Add(-2*time.Hour + 5*time.Minute),
			"duration":    300, // 秒
			"success":     true,
			"output": gin.H{
				"processedRecords": 1250,
				"errors":           0,
			},
		},
		{
			"id":          "exec_2",
			"workflowId":  workflowID,
			"status":      "failed",
			"startedAt":   time.Now().Add(-6 * time.Hour),
			"completedAt": time.Now().Add(-6*time.Hour + 2*time.Minute),
			"duration":    120,
			"success":     false,
			"error":       "数据源连接超时",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"executions": executions,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": len(executions),
			},
		},
	})
}
