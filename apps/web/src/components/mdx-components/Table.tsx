interface TableProps {
  children: React.ReactNode
}

export function Table({ children }: TableProps) {
  return (
    <div className='overflow-x-auto my-6 rounded-lg border border-border'>
      <table className='min-w-full divide-y divide-border'>{children}</table>
    </div>
  )
}

export function TableHead({ children }: TableProps) {
  return <thead className='bg-muted/50'>{children}</thead>
}

export function TableBody({ children }: TableProps) {
  return <tbody className='divide-y divide-border bg-card'>{children}</tbody>
}

export function TableRow({ children }: TableProps) {
  return <tr className='transition-colors hover:bg-muted/30'>{children}</tr>
}

export function TableCell({ children }: TableProps) {
  return (
    <td className='px-6 py-4 text-sm text-foreground whitespace-nowrap'>
      {children}
    </td>
  )
}

export function TableHeader({ children }: TableProps) {
  return (
    <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
      {children}
    </th>
  )
}
