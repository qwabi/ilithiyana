import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VsPageContent } from '@/app/components/competitors/VsPageContent';
import {
  getAllCompetitorSlugs,
  getCompetitor,
} from '@/lib/competitors';
import { brand } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllCompetitorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) return {};

  return pageMetadata({
    title: `${brand.name} vs ${competitor.name}`,
    description: `Compare ${brand.name} and ${competitor.name} for CAPS Grades 6–12 tutoring in South Africa — pricing, career guidance, Sciences, and managed programmes.`,
    path: `/vs/${slug}`,
  });
}

export default async function VsPage({ params }: PageProps) {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) notFound();

  return <VsPageContent competitor={competitor} />;
}
