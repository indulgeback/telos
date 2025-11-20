interface RequireContext {
  keys(): string[]
  (id: string): any
  <T>(id: string): T
  resolve(id: string): string
  id: string
}

interface NodeRequire {
  context(
    directory: string,
    useSubdirectories?: boolean,
    regExp?: RegExp,
    mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once'
  ): RequireContext
}

declare let require: NodeRequire
