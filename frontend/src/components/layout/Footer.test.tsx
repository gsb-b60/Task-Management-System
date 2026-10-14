import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'

describe('Footer', () => {
  it('credits the author and links the three profiles', () => {
    render(<Footer />)

    expect(screen.getByText(/Nguyen Dinh Hieu/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/gsb-b60',
    )
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute(
      'href',
      'https://gsb-b60.github.io/',
    )
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/hieu-nguyendinh-969b21247',
    )
  })

  it('opens profiles in a new tab without leaking a referrer opener', () => {
    render(<Footer />)

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel')).toContain('noreferrer')
    }
  })
})
