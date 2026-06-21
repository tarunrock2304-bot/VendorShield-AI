export default function SystemSettings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
        <p className="text-slate-500 mt-1">Admin-only system configuration and platform preferences.</p>
      </div>

      <div className="card p-6 space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Platform Theme</p>
          <p className="text-sm text-slate-500 mt-1">Adjust branding, colors, and interface preferences.</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Security Defaults</p>
          <p className="text-sm text-slate-500 mt-1">Control authentication and authorization behavior.</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Notifications</p>
          <p className="text-sm text-slate-500 mt-1">Tune alerts and reporting preferences for the platform.</p>
        </div>
      </div>
    </div>
  );
}
