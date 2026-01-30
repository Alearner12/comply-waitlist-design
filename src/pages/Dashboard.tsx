import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getScoreColor, getScoreRingColor } from '@/lib/scanner';
import { toast } from 'sonner';

interface ScanRecord {
    id: string;
    website_url: string;
    accessibility_score: number | null;
    summary: { total: number; critical: number; high: number; medium: number; low: number };
    pages_scanned: number | null;
    created_at: string;
}

interface MonitoredSite {
    id: string;
    website_url: string;
    last_score: number | null;
    previous_score: number | null;
    scan_frequency: string;
    is_active: boolean;
    created_at: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [scans, setScans] = useState<ScanRecord[]>([]);
    const [monitoredSites, setMonitoredSites] = useState<MonitoredSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [addSiteUrl, setAddSiteUrl] = useState('');
    const [addingSite, setAddingSite] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;

        const [scansRes, sitesRes] = await Promise.all([
            supabase
                .from('scan_results')
                .select('id, website_url, accessibility_score, summary, pages_scanned, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20),
            supabase
                .from('monitored_sites')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
        ]);

        if (scansRes.data) setScans(scansRes.data);
        if (sitesRes.data) setMonitoredSites(sitesRes.data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddSite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addSiteUrl.trim() || !user) return;

        setAddingSite(true);
        const { error } = await supabase.from('monitored_sites').insert({
            user_id: user.id,
            website_url: addSiteUrl.trim(),
        });

        if (error) {
            if (error.code === '23505') {
                toast.error('This site is already being monitored');
            } else {
                toast.error('Failed to add site');
            }
        } else {
            toast.success('Site added for monitoring');
            setAddSiteUrl('');
            fetchData();
        }
        setAddingSite(false);
    };

    const handleRescan = (url: string) => {
        navigate('/?scan=' + encodeURIComponent(url));
    };

    const getScoreTrend = (current: number | null, previous: number | null) => {
        if (current === null || previous === null) return null;
        if (current > previous) return 'up';
        if (current < previous) return 'down';
        return 'same';
    };

    // Group scans by website_url, take latest per site
    const siteMap = new Map<string, ScanRecord>();
    scans.forEach((scan) => {
        if (!siteMap.has(scan.website_url)) {
            siteMap.set(scan.website_url, scan);
        }
    });
    const uniqueSites = Array.from(siteMap.values());

    return (
        <DashboardLayout>
            <div className="max-w-5xl">
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Dashboard</h1>
                <p className="text-gray-500 mb-8">Track your accessibility compliance progress</p>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Monitored Sites */}
                        <section className="mb-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Monitored Sites</h2>
                            </div>

                            {monitoredSites.length > 0 && (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                                    {monitoredSites.map((site) => {
                                        const trend = getScoreTrend(site.last_score, site.previous_score);
                                        return (
                                            <div key={site.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <p className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                                                        {site.website_url}
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        site.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {site.scan_frequency}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {site.last_score !== null ? (
                                                        <>
                                                            <div className={`w-12 h-12 rounded-full border-2 ${getScoreRingColor(site.last_score)} flex items-center justify-center`}>
                                                                <span className={`text-sm font-bold ${getScoreColor(site.last_score)}`}>
                                                                    {site.last_score}
                                                                </span>
                                                            </div>
                                                            {trend && (
                                                                <span className={`text-sm ${
                                                                    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'
                                                                }`}>
                                                                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {
                                                                        trend !== 'same' && site.previous_score !== null && site.last_score !== null
                                                                            ? Math.abs(site.last_score - site.previous_score) + ' pts'
                                                                            : ''
                                                                    }
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">No scans yet</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRescan(site.website_url)}
                                                    className="mt-3 text-xs text-gray-600 hover:text-gray-900 underline"
                                                >
                                                    Re-scan now
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add Site Form */}
                            <form onSubmit={handleAddSite} className="flex gap-2">
                                <input
                                    type="text"
                                    value={addSiteUrl}
                                    onChange={(e) => setAddSiteUrl(e.target.value)}
                                    placeholder="Add a site to monitor (e.g. drsmith.com)"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                                <button
                                    type="submit"
                                    disabled={addingSite}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {addingSite ? 'Adding...' : 'Add Site'}
                                </button>
                            </form>
                        </section>

                        {/* Scan History */}
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Scans</h2>

                            {scans.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                    <p className="text-gray-500 mb-4">No scans yet. Run your first scan from the home page.</p>
                                    <Link
                                        to="/"
                                        className="inline-flex px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
                                    >
                                        Scan a Website
                                    </Link>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-left">
                                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Site</th>
                                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Issues</th>
                                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pages</th>
                                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {scans.map((scan) => (
                                                <tr key={scan.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                                                        {scan.website_url}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {scan.accessibility_score !== null ? (
                                                            <span className={`text-sm font-bold ${getScoreColor(scan.accessibility_score)}`}>
                                                                {scan.accessibility_score}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-1">
                                                            {scan.summary?.critical > 0 && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                                                    {scan.summary.critical}C
                                                                </span>
                                                            )}
                                                            {scan.summary?.high > 0 && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                                                                    {scan.summary.high}H
                                                                </span>
                                                            )}
                                                            {scan.summary?.medium > 0 && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                                                    {scan.summary.medium}M
                                                                </span>
                                                            )}
                                                            {scan.summary?.low > 0 && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                                    {scan.summary.low}L
                                                                </span>
                                                            )}
                                                            {scan.summary?.total === 0 && (
                                                                <span className="text-xs text-green-600">Clean</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        {scan.pages_scanned || 1}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        {new Date(scan.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleRescan(scan.website_url)}
                                                            className="text-xs text-gray-600 hover:text-gray-900 underline"
                                                        >
                                                            Re-scan
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
