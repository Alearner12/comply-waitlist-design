import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getSeverityBgColor } from '@/lib/scanner';
import { toast } from 'sonner';

type ComplianceStatus = 'found' | 'acknowledged' | 'in_progress' | 'fixed' | 'wont_fix';

interface ComplianceEntry {
    id: string;
    scan_result_id: string | null;
    website_url: string;
    finding_id: string;
    finding_check: string;
    severity: string;
    wcag_criterion: string | null;
    status: ComplianceStatus;
    status_changed_at: string;
    notes: string | null;
    created_at: string;
}

const STATUS_LABELS: Record<ComplianceStatus, string> = {
    found: 'Found',
    acknowledged: 'Acknowledged',
    in_progress: 'In Progress',
    fixed: 'Fixed',
    wont_fix: "Won't Fix",
};

const STATUS_COLORS: Record<ComplianceStatus, string> = {
    found: 'bg-red-100 text-red-800',
    acknowledged: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    fixed: 'bg-green-100 text-green-800',
    wont_fix: 'bg-gray-100 text-gray-600',
};

const STATUS_ORDER: ComplianceStatus[] = ['found', 'acknowledged', 'in_progress', 'fixed', 'wont_fix'];

export default function ComplianceTracker() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<ComplianceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSite, setFilterSite] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNotes, setEditNotes] = useState('');

    const fetchEntries = useCallback(async () => {
        if (!user) return;

        const query = supabase
            .from('compliance_log')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        const { data } = await query;
        if (data) setEntries(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const updateStatus = async (entryId: string, newStatus: ComplianceStatus, notes?: string) => {
        const { error } = await supabase
            .from('compliance_log')
            .update({
                status: newStatus,
                status_changed_at: new Date().toISOString(),
                ...(notes !== undefined ? { notes } : {}),
            })
            .eq('id', entryId);

        if (error) {
            toast.error('Failed to update status');
            return;
        }

        toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
        setEditingId(null);
        fetchEntries();
    };

    // Unique sites for filter
    const sites = Array.from(new Set(entries.map((e) => e.website_url)));

    // Apply filters
    const filtered = entries.filter((e) => {
        if (filterSite !== 'all' && e.website_url !== filterSite) return false;
        if (filterStatus !== 'all' && e.status !== filterStatus) return false;
        return true;
    });

    // Group by status for progress
    const statusCounts = STATUS_ORDER.reduce((acc, s) => {
        acc[s] = entries.filter((e) => e.status === s && (filterSite === 'all' || e.website_url === filterSite)).length;
        return acc;
    }, {} as Record<string, number>);
    const totalEntries = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const resolvedCount = (statusCounts.fixed || 0) + (statusCounts.wont_fix || 0);

    return (
        <DashboardLayout>
            <div className="max-w-5xl">
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Compliance Tracker</h1>
                <p className="text-gray-500 mb-8">Track findings from discovery to resolution</p>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <p className="text-gray-500">No compliance entries yet. Run a scan while logged in to start tracking findings.</p>
                    </div>
                ) : (
                    <>
                        {/* Progress Bar */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-medium text-gray-700">Resolution Progress</h2>
                                <span className="text-sm text-gray-500">
                                    {resolvedCount} of {totalEntries} resolved
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                {STATUS_ORDER.map((s) => {
                                    const count = statusCounts[s] || 0;
                                    if (count === 0 || totalEntries === 0) return null;
                                    const width = (count / totalEntries) * 100;
                                    const colors: Record<string, string> = {
                                        found: 'bg-red-400',
                                        acknowledged: 'bg-yellow-400',
                                        in_progress: 'bg-blue-400',
                                        fixed: 'bg-green-400',
                                        wont_fix: 'bg-gray-400',
                                    };
                                    return (
                                        <div
                                            key={s}
                                            className={`${colors[s]} h-full`}
                                            style={{ width: `${width}%` }}
                                            title={`${STATUS_LABELS[s as ComplianceStatus]}: ${count}`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="flex gap-4 mt-3 flex-wrap">
                                {STATUS_ORDER.map((s) => (
                                    <div key={s} className="flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s].split(' ')[0]}`} />
                                        <span className="text-xs text-gray-600">
                                            {STATUS_LABELS[s]} ({statusCounts[s] || 0})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-3 mb-4">
                            <select
                                value={filterSite}
                                onChange={(e) => setFilterSite(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            >
                                <option value="all">All Sites</option>
                                {sites.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            >
                                <option value="all">All Statuses</option>
                                {STATUS_ORDER.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Entries List */}
                        <div className="space-y-3">
                            {filtered.map((entry) => (
                                <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityBgColor(entry.severity as 'critical' | 'high' | 'medium' | 'low')}`}>
                                                    {entry.severity}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
                                                    {STATUS_LABELS[entry.status]}
                                                </span>
                                                {entry.wcag_criterion && (
                                                    <span className="text-xs text-gray-400">{entry.wcag_criterion}</span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">{entry.finding_check}</p>
                                            <p className="text-xs text-gray-400 mt-1">{entry.website_url}</p>
                                            {entry.notes && (
                                                <p className="text-xs text-gray-500 mt-2 italic">Note: {entry.notes}</p>
                                            )}
                                        </div>

                                        <div className="shrink-0 flex flex-col gap-1">
                                            {editingId === entry.id ? (
                                                <div className="flex flex-col gap-2 w-48">
                                                    <select
                                                        defaultValue={entry.status}
                                                        onChange={(e) => {
                                                            updateStatus(entry.id, e.target.value as ComplianceStatus, editNotes || undefined);
                                                        }}
                                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                                    >
                                                        {STATUS_ORDER.map((s) => (
                                                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={editNotes}
                                                        onChange={(e) => setEditNotes(e.target.value)}
                                                        placeholder="Add a note..."
                                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                                    />
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingId(entry.id);
                                                        setEditNotes(entry.notes || '');
                                                    }}
                                                    className="text-xs text-gray-600 hover:text-gray-900 underline"
                                                >
                                                    Update
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                                        <span>Found: {new Date(entry.created_at).toLocaleDateString()}</span>
                                        {entry.status !== 'found' && (
                                            <span>Last updated: {new Date(entry.status_changed_at).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filtered.length === 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                    <p className="text-gray-500">No entries match your filters.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
