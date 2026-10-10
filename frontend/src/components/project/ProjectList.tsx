import { ProjectCard } from './ProjectCard'
import type { ProjectListItem } from '../../api/types'

interface ProjectListProps {
  projects: ProjectListItem[]
  selectedProjectId: string
  onSelect: (projectId: string) => void
  onEdit?: (projectId: string) => void
  onDelete?: (project: ProjectListItem) => void
}

export function ProjectList({ projects, selectedProjectId, onSelect, onEdit, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onSelect(project.id)}
          isSelected={selectedProjectId === project.id}
          onEdit={onEdit ? () => onEdit(project.id) : undefined}
          onDelete={onDelete ? () => onDelete(project) : undefined}
        />
      ))}
    </div>
  )
}