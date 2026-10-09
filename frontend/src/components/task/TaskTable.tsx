import { forwardRef } from 'react'
import { Table, THead, TBody, Tr, Th } from '../ui/Table'
import { TaskRow } from './TaskRow'
import type { Task } from '../../api/types'
import { Pagination } from '../Pagination'

interface TaskTableProps {
  tasks: Task[]
  meta: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export const TaskTable = forwardRef<HTMLTableElement, TaskTableProps>(
  ({ tasks, meta, onPageChange, onPageSizeChange }, ref) => {

    if (tasks.length === 0) {
      return null
    }

    return (
      <div className="overflow-x-auto">
        <Table ref={ref} className="w-full">
          <THead>
            <Tr>
              <Th className="w-12">#</Th>
              <Th>Task</Th>
              <Th className="w-28">Priority</Th>
              <Th className="w-32">Status</Th>
              <Th className="w-36 text-right">Due</Th>
            </Tr>
          </THead>
          <TBody>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </TBody>
        </Table>
        <Pagination
          page={meta.page}
          pageSize={meta.pageSize}
          totalItems={meta.totalItems}
          totalPages={meta.totalPages}
          hasNextPage={meta.hasNextPage}
          hasPreviousPage={meta.hasPreviousPage}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    )
  },
)

TaskTable.displayName = 'TaskTable'