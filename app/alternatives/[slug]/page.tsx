import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlternativePageContent } from '@/app/components/competitors/AlternativePageContent';
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
    title: `Best ${competitor.name} Alternative — Grades 6–12`,
    description: `Looking for a ${competitor.name} alternative in South Africa? Compare managed online CAPS tutoring with career guidance — ${brand.name} vs ${competitor.typeLabel}.`,
    path: `/alternatives/${slug}`,
  });
}

export default async function AlternativePage({ params }: PageProps) {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) notFound();

  return <AlternativePageContent competitor={competitor} />;
}
