import { forwardRef } from 'react'

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  className?: string
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className = '', children, ...props }, ref) => (
    <table ref={ref} className={`w-full text-sm ${className}`} {...props}>
      {children}
    </table>
  ),
)

Table.displayName = 'Table'

interface THeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

export const THead = forwardRef<HTMLTableSectionElement, THeadProps>(
  ({ className = '', children, ...props }, ref) => (
    <thead ref={ref} className={`text-[10px] uppercase tracking-wide text-faint ${className}`} {...props}>
      {children}
    </thead>
  ),
)

THead.displayName = 'THead'

interface TBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

export const TBody = forwardRef<HTMLTableSectionElement, TBodyProps>(
  ({ className = '', children, ...props }, ref) => (
    <tbody ref={ref} className={`divide-y divide-linesoft ${className}`} {...props}>
      {children}
    </tbody>
  ),
)

TBody.displayName = 'TBody'

interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string
}

export const Tr = forwardRef<HTMLTableRowElement, TrProps>(
  ({ className = '', children, ...props }, ref) => (
    <tr ref={ref} className={className} {...props}>
      {children}
    </tr>
  ),
)

Tr.displayName = 'Tr'

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  className?: string
}

export const Th = forwardRef<HTMLTableCellElement, ThProps>(
  ({ className = '', children, ...props }, ref) => (
    <th
      ref={ref}
      className={`px-3 py-2 font-semibold text-left ${className}`}
      {...props}
    >
      {children}
    </th>
  ),
)

Th.displayName = 'Th'

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string
}

export const Td = forwardRef<HTMLTableCellElement, TdProps>(
  ({ className = '', children, ...props }, ref) => (
    <td ref={ref} className={`px-3 py-2 ${className}`} {...props}>
      {children}
    </td>
  ),
)

Td.displayName = 'Td'