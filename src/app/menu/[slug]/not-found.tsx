import Link from "next/link";
import { QrCode } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export default function MenuNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-500">
        <QrCode className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-slate-900">Menu Currently Unavailable</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        This digital menu is either unpublished, temporarily unavailable, or this QR code has been
        replaced. Please ask restaurant staff for assistance.
      </p>
      <Button variant="outline" className="mt-6" asChild>
        <Link href="/">Back to Tablory</Link>
      </Button>
    </div>
  );
}
