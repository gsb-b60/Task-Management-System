import { ProjectCard } from './ProjectCard'
import type { ProjectListItem } from '../../api/types'

interface ProjectListProps {
  projects: ProjectListItem[]
  selectedProjectId: string
  onSelect: (projectId: string) => void
}

export function ProjectList({ projects, selectedProjectId, onSelect }: ProjectListProps) {
  if (projects.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onSelect(project.id)}
          isSelected={selectedProjectId === project.id}
        />
      ))}
    </div>
  )
}