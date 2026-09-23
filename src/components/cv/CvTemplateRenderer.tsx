'use client'

import type { CvTemplate } from '@/lib/cv'
import type { CvTemplateData } from './cvTemplateTypes'
import CvTemplateMinimal from './CvTemplateMinimal'
import CvTemplateClassic from './CvTemplateClassic'
import CvTemplateSidebar from './CvTemplateSidebar'

export default function CvTemplateRenderer({ template, cv }: { template: CvTemplate; cv: CvTemplateData }) {
  if (template === 'classic') return <CvTemplateClassic cv={cv} />
  if (template === 'sidebar') return <CvTemplateSidebar cv={cv} />
  return <CvTemplateMinimal cv={cv} />
}
