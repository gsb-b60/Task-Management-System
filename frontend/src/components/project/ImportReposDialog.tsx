import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi, dataApi, isApiError } from '../../api'
import type { GitHubRepository, ProjectListItem } from '../../api/types'
import { useCreateProjectsFromGitHub } from '../../hooks/useProjectMutations'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { TextInput } from '../ui/Input'
import { IconGithub } from '../ui/Icons'

interface ImportReposDialogProps {
  open: boolean
  onClose: () => void
  /** Current projects — used to badge already-linked repositories. */
  projects: ProjectListItem[]
}

/**
 * Bulk-add step: search your GitHub repositories, tick several, adjust each
 * project title, and create them all linked in one request. The server skips
 * duplicates per item, so re-running is safe.
 */
export function ImportReposDialog({ open, onClose, projects }: ImportReposDialogProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [titles, setTitles] = useState<Record<string, string>>({})
  const createFromGitHub = useCreateProjectsFromGitHub()

  const reposQuery = useQuery({
    queryKey: ['github', 'repositories'],
    queryFn: () => dataApi.github.listRepositories(),
    enabled: open,
    staleTime: 60000,
    retry: false,
  })

  const linkedIds = useMemo(
    () =>
      new Set(
        projects.flatMap((p) => (p.repository ? [p.repository.githubId] : [])),
      ),
    [projects],
  )

  const repos = reposQuery.data ?? []
  const query = search.trim().toLowerCase()
  const visible =
    query === ''
      ? repos
      : repos.filter((repo) =>
          [repo.name, repo.fullName, repo.description ?? '']
            .join(' ')
            .toLowerCase()
            .includes(query),
        )

  function toggle(repo: GitHubRepository) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(repo.githubId)) {
        next.delete(repo.githubId)
      } else {
        next.add(repo.githubId)
      }
      return next
    })
    setTitles((previous) =>
      previous[repo.githubId] === undefined
        ? { ...previous, [repo.githubId]: repo.name }
        : previous,
    )
  }

  async function handleAdd() {
    const items = [...selected]
      .map((githubId) => repos.find((repo) => repo.githubId === githubId))
      .filter((repo): repo is GitHubRepository => repo !== undefined)
      .map((repo) => ({
        githubId: repo.githubId,
        // A blank title falls back to the repo name — the API rejects empties.
        name: titles[repo.githubId]?.trim() || repo.name,
        description: repo.description,
      }))
    if (items.length === 0) return
    try {
      await createFromGitHub.mutateAsync(items)
      onClose()
    } catch {
      // Error toast comes from the mutation; keep the dialog open to retry.
    }
  }

  const notLinked =
    reposQuery.isError &&
    isApiError(reposQuery.error) &&
    (reposQuery.error.status === 428 || reposQuery.error.code === 'GITHUB_NOT_LINKED')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add projects from GitHub"
      description="Search your repositories, choose several, set each project title."
      className="max-w-lg"
    >
      {reposQuery.isPending && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      )}

      {notLinked && (
        <div className="border border-line rounded-md p-4 text-center">
          <IconGithub className="w-6 h-6 mx-auto text-faint" />
          <p className="text-sm font-semibold text-fg mt-2">GitHub is not connected</p>
          <p className="text-xs text-muted mt-1">
            Connect your account to browse repositories.
          </p>
          <a
            href={authApi.githubAuthorizeUrl()}
            className="mt-3 inline-flex items-center gap-2 bg-ok text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-ok-dark"
          >
            <IconGithub className="w-4 h-4" />
            Connect GitHub
          </a>
        </div>
      )}

      {reposQuery.isError && !notLinked && (
        <div className="border border-bad rounded-md p-4 text-center">
          <p className="text-sm font-semibold text-bad">Could not load repositories</p>
          <p className="text-xs text-muted mt-1">{reposQuery.error.message}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => reposQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {reposQuery.isSuccess && (
        <div className="space-y-3">
          <TextInput
            aria-label="Search repositories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description…"
          />

          {visible.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">
              {repos.length === 0 ? 'No repositories found on your GitHub account.' : 'No repositories match your search.'}
            </p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
              {visible.map((repo) => {
                const linked = linkedIds.has(repo.githubId)
                const checked = selected.has(repo.githubId)
                return (
                  <li
                    key={repo.githubId}
                    className={`border rounded-md p-2.5 ${checked ? 'border-accent bg-accentbg/40' : 'border-line'}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${repo.fullName}`}
                        checked={checked}
                        disabled={linked}
                        onChange={() => toggle(repo)}
                        className="mt-1 h-4 w-4 accent-[#0969da]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-fg truncate">
                            {repo.fullName}
                          </span>
                          {linked && (
                            <span className="flex-none text-[10px] font-semibold text-faint border border-line rounded-full px-1.5 py-0.5">
                              Added
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-[11px] text-muted truncate mt-0.5">
                            {repo.description}
                          </p>
                        )}
                        {checked && (
                          <div className="mt-1.5">
                            <TextInput
                              aria-label={`Project title for ${repo.fullName}`}
                              value={titles[repo.githubId] ?? repo.name}
                              onChange={(e) =>
                                setTitles((previous) => ({
                                  ...previous,
                                  [repo.githubId]: e.target.value,
                                }))
                              }
                              placeholder="Project title"
                              maxLength={200}
                              className="py-1.5 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="text-[11px] text-faint">
            Adding a project also imports all of its issues — closed land in Done,
            open ones in Todo, and `in progress` / `wip` labels in In Progress.
          </p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs text-faint">
              {selected.size === 0 ? 'Select at least one repository' : `${selected.size} selected`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                loading={createFromGitHub.isPending}
                loadingLabel="Adding…"
                disabled={selected.size === 0}
                onClick={handleAdd}
              >
                Add {selected.size > 0 ? `${selected.size} ` : ''}project{selected.size === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}
