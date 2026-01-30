import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Badge {
    id: string;
    website_url: string;
    badge_token: string;
    last_score: number | null;
    last_scan_date: string | null;
    is_active: boolean;
    created_at: string;
}

export default function BadgeGenerator() {
    const { user } = useAuth();
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSiteUrl, setNewSiteUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchBadges = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('compliance_badges')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) setBadges(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchBadges();
    }, [fetchBadges]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSiteUrl.trim() || !user) return;

        setCreating(true);
        const { error } = await supabase.from('compliance_badges').insert({
            user_id: user.id,
            website_url: newSiteUrl.trim(),
        });

        if (error) {
            if (error.code === '23505') {
                toast.error('A badge for this site already exists');
            } else {
                toast.error('Failed to create badge');
            }
        } else {
            toast.success('Badge created');
            setNewSiteUrl('');
            fetchBadges();
        }
        setCreating(false);
    };

    const getEmbedCode = (badge: Badge) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const badgeUrl = `${supabaseUrl}/functions/v1/badge?token=${badge.badge_token}`;
        const siteUrl = badge.website_url.startsWith('http') ? badge.website_url : `https://${badge.website_url}`;
        return `<a href="${siteUrl}" title="Accessibility monitored by Comply"><img src="${badgeUrl}" alt="Accessibility Monitored by Comply" width="200" height="36" /></a>`;
    };

    const copyEmbed = (badge: Badge) => {
        navigator.clipboard.writeText(getEmbedCode(badge));
        setCopiedId(badge.id);
        toast.success('Embed code copied!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const renderBadgePreview = (badge: Badge) => {
        const score = badge.last_score;
        const date = badge.last_scan_date
            ? new Date(badge.last_scan_date).toLocaleDateString()
            : 'Not scanned';
        const color = score === null ? '#6b7280' : score >= 90 ? '#16a34a' : score >= 70 ? '#ca8a04' : '#dc2626';

        return (
            <svg width="200" height="36" viewBox="0 0 200 36" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="36" rx="4" fill="#f8f9fa" stroke="#e5e7eb" />
                <rect width="36" height="36" rx="4" fill={color} />
                <text x="18" y="22" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
                    {score ?? '?'}
                </text>
                <text x="44" y="15" fill="#111827" fontSize="10" fontWeight="600" fontFamily="sans-serif">
                    Accessibility Monitored
                </text>
                <text x="44" y="27" fill="#6b7280" fontSize="9" fontFamily="sans-serif">
                    by Comply · {date}
                </text>
            </svg>
        );
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Compliance Badge</h1>
                <p className="text-gray-500 mb-8">
                    Generate an embeddable badge to show your commitment to accessibility
                </p>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Create Badge */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h2 className="text-sm font-medium text-gray-700 mb-3">Create a badge for your website</h2>
                            <form onSubmit={handleCreate} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSiteUrl}
                                    onChange={(e) => setNewSiteUrl(e.target.value)}
                                    placeholder="yourpractice.com"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Generate Badge'}
                                </button>
                            </form>
                        </div>

                        {/* Badge List */}
                        {badges.length > 0 && (
                            <div className="space-y-4">
                                {badges.map((badge) => (
                                    <div key={badge.id} className="bg-white rounded-xl border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-sm font-medium text-gray-900">{badge.website_url}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                badge.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {badge.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>

                                        {/* Preview */}
                                        <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-center">
                                            {renderBadgePreview(badge)}
                                        </div>

                                        {/* Embed Code */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Embed Code</label>
                                            <div className="relative">
                                                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto">
                                                    {getEmbedCode(badge)}
                                                </pre>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => copyEmbed(badge)}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                        >
                                            {copiedId === badge.id ? 'Copied!' : 'Copy Embed Code'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {badges.length === 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                <p className="text-gray-500">Create your first badge above to show your accessibility commitment.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
