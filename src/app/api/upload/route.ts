import { NextRequest, NextResponse } from "next/server";
import { parseWorkbook } from "@/lib/parsing/excel";
import { analyzeBooking } from "@/lib/analyze";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded. Attach an .xlsx file as 'file'." }, { status: 400 });
    }
    if (!/\.xlsx$/i.test(file.name)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.name}. Upload a .xlsx file.` }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await parseWorkbook(buf);
    const analyzed = parsed.bookings.map(analyzeBooking);
    return NextResponse.json({
      bookings: analyzed,
      unmatchedItems: parsed.unmatchedItems,
      duplicateBookingRefs: parsed.duplicateBookingRefs,
      fileErrors: parsed.fileErrors,
    });
  } catch (e) {
    return NextResponse.json({ error: `Server error while parsing file: ${(e as Error).message}` }, { status: 500 });
  }
}
