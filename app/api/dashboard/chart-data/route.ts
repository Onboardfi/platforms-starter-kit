import { NextResponse } from 'next/server';
import { getAgentAndSiteCounts } from '@/lib/data/dashboard';

export async function POST(req: Request) {
  try {
    const { startDate, endDate } = await req.json();
    
    const chartData = await getAgentAndSiteCounts(
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}