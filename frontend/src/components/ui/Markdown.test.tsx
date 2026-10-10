import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown } from './Markdown'

describe('Markdown', () => {
  it('renders emphasis and strong text', () => {
    render(<Markdown text="Hello **bold** and *italic* world" />)

    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
  })

  it('renders GFM task lists and tables', () => {
    render(
      <Markdown
        text={"- [x] done\n- [ ] todo\n\n| a | b |\n|---|---|\n| 1 | 2 |"}
      />,
    )

    expect(screen.getByRole('checkbox', { checked: true })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('opens links in a new tab', () => {
    render(<Markdown text="[docs](https://example.com/docs)" />)

    const link = screen.getByRole('link', { name: 'docs' })
    expect(link).toHaveAttribute('href', 'https://example.com/docs')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders fenced code without executing raw HTML', () => {
    const { container } = render(
      <Markdown text={'```js\nconst a = 1\n```\n\n<img src="x" />'} />,
    )

    expect(screen.getByText('const a = 1')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders plain text as-is', () => {
    render(<Markdown text="Just a plain description." />)

    expect(screen.getByText('Just a plain description.')).toBeInTheDocument()
  })
})
