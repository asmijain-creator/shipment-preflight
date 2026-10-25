export default function QueuePage() {
  return (
    <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
      <h1 className="text-xl font-semibold mb-2 text-slate-900">Review queue</h1>
      <p>Upload a workbook on the home page to populate the queue. State is held per upload session.</p>
      <p className="mt-2">
        <a href="/" className="text-blue-600 underline">Go to upload</a>
      </p>
    </div>
  );
}
