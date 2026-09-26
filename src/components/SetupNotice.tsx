export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-lg p-6">
        <h1 className="text-lg font-bold text-slate-800">Supabase isn't configured yet</h1>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Create a project at supabase.com.</li>
          <li>
            Run <code className="kbd">supabase/migrations/001_schema.sql</code> then{' '}
            <code className="kbd">supabase/seed.sql</code> in the SQL Editor.
          </li>
          <li>
            Copy <code className="kbd">.env.example</code> to <code className="kbd">.env</code> and paste your
            project URL and anon key.
          </li>
          <li>Restart <code className="kbd">npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  );
}
