import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Appearance from '@/models/Appearance';

const EMPTY = { row1: [] as string[], row2: [] as string[] };

export async function GET() {
  try {
    await dbConnect();
    const appearance = (await Appearance.findOne({
      project: 'manasik',
    }).lean()) as {
      worksImages?: { row1: string[]; row2: string[] };
    } | null;

    if (!appearance) {
      return NextResponse.json({ success: true, data: EMPTY });
    }

    return NextResponse.json({
      success: true,
      data: {
        row1: appearance.worksImages?.row1 ?? [],
        row2: appearance.worksImages?.row2 ?? [],
      },
    });
  } catch {
    return NextResponse.json({ success: true, data: EMPTY });
  }
}
