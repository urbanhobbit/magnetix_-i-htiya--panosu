import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
import {
  RefreshCw, Users, Layers, BarChart3, FileDown, ChevronDown,
  ChevronRight, Edit2, Check, X, Loader2, Eye, Filter,
  TrendingUp, Folder, AlertCircle,
} from 'lucide-react';

// ─── Config ─────────────────────────────────────────────────────────────────

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

// ─── Types ──────────────────────────────────────────────────────────────────

type Stage = 'pool' | 'selected' | 'processed';

interface NeedRecord {
  id: string;
  text: string;
  stage: Stage;
  groupId: string;
  groupName: string;
}

interface GroupRecord {
  id: string;
  name: string;
  stage: Stage;
}

interface SessionData {
  sessionId: string;
  expertName: string;
  startedAt: string;
  submittedAt: string;
  needs: NeedRecord[];
  groups: GroupRecord[];
}

// ─── Stage Colors ───────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string }> = {
  pool: { label: 'Havuz', color: '#d4a820', bg: '#fdfaf0' },
  selected: { label: 'Seçim', color: '#38a020', bg: '#f0faf0' },
  processed: { label: 'Dönüşüm', color: '#2060c0', bg: '#eef5fd' },
};

const CHART_COLORS = [
  '#8a6a20', '#2e7020', '#1050a0', '#d4a820', '#38a020', '#2060c0',
  '#e85d04', '#9b5de5', '#00b4d8', '#e63946', '#06d6a0', '#ffd166',
];

// ─── Data Fetching ──────────────────────────────────────────────────────────

function useSheetData() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!APPS_SCRIPT_URL) {
      setError('VITE_APPS_SCRIPT_URL ayarlanmamis. .env dosyasini kontrol edin.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=sessions`);
      const data = await res.json();
      setSessions(data.sessions || []);
      setLastFetch(new Date());
    } catch (err) {
      setError(`Veri cekilemedi: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNeed = useCallback(async (
    sessionId: string, needId: string, field: string, value: string
  ) => {
    if (!APPS_SCRIPT_URL) return;
    try {
      const params = new URLSearchParams({
        action: 'update', sessionId, needId, field, value,
      });
      await fetch(`${APPS_SCRIPT_URL}?${params}`);
      // Refresh
      await fetchData();
    } catch (err) {
      console.error('Update failed:', err);
    }
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { sessions, loading, error, lastFetch, fetchData, updateNeed };
}

// ─── Demo Data (for when no Sheets URL is configured) ────────────────────────

function useDemoData(): ReturnType<typeof useSheetData> {
  const demoSessions: SessionData[] = useMemo(() => [
    {
      sessionId: 'demo_1', expertName: 'Demo Uzman A', startedAt: '2026-04-10T09:00:00Z', submittedAt: '2026-04-10T09:45:00Z',
      needs: [
        { id: 'n1', text: 'Bakimverene destek', stage: 'selected', groupId: 'g1', groupName: 'Aile ve Bakim' },
        { id: 'n3', text: 'Internet baglantisi', stage: 'selected', groupId: 'g2', groupName: 'Dijital Erisim' },
        { id: 'n4', text: 'Bilgisayar/Tablet', stage: 'processed', groupId: 'g2', groupName: 'Dijital Erisim' },
        { id: 'n8', text: 'Okul yemegi', stage: 'selected', groupId: 'g3', groupName: 'Egitim ve Gelisim' },
        { id: 'n15', text: 'Temel saglik hizmetleri', stage: 'processed', groupId: 'g5', groupName: 'Saglik ve Refah' },
        { id: 'n26', text: 'Gida ve beslenme', stage: 'processed', groupId: 'g7', groupName: 'Temel Yasam' },
        { id: 'n27', text: 'Elektrik, su, isinma', stage: 'selected', groupId: 'g7', groupName: 'Temel Yasam' },
        { id: 'n28', text: 'Temel giyim ihtiyaclari', stage: 'pool', groupId: 'g7', groupName: 'Temel Yasam' },
      ],
      groups: [
        { id: 'g1', name: 'Aile ve Bakim', stage: 'pool' },
        { id: 'g2', name: 'Dijital Erisim', stage: 'selected' },
        { id: 'g3', name: 'Egitim ve Gelisim', stage: 'pool' },
        { id: 'g5', name: 'Saglik ve Refah', stage: 'pool' },
        { id: 'g7', name: 'Temel Yasam', stage: 'selected' },
      ],
    },
    {
      sessionId: 'demo_2', expertName: 'Demo Uzman B', startedAt: '2026-04-10T10:00:00Z', submittedAt: '2026-04-10T10:30:00Z',
      needs: [
        { id: 'n3', text: 'Internet baglantisi', stage: 'processed', groupId: 'g2', groupName: 'Dijital Erisim' },
        { id: 'n5', text: 'Dijital okuryazarlik', stage: 'selected', groupId: 'g2', groupName: 'Dijital Erisim' },
        { id: 'n11', text: 'Rehberlik ve psikolojik destek', stage: 'processed', groupId: 'g3', groupName: 'Egitim ve Gelisim' },
        { id: 'n15', text: 'Temel saglik hizmetleri', stage: 'selected', groupId: 'g5', groupName: 'Saglik ve Refah' },
        { id: 'n21', text: 'Okul gezileri', stage: 'selected', groupId: 'g6', groupName: 'Sosyal Katilim' },
        { id: 'n26', text: 'Gida ve beslenme', stage: 'processed', groupId: 'g7', groupName: 'Temel Yasam' },
      ],
      groups: [
        { id: 'g2', name: 'Dijital Erisim', stage: 'selected' },
        { id: 'g3', name: 'Egitim ve Gelisim', stage: 'selected' },
        { id: 'g5', name: 'Saglik ve Refah', stage: 'pool' },
        { id: 'g6', name: 'Sosyal Katilim', stage: 'pool' },
        { id: 'g7', name: 'Temel Yasam', stage: 'processed' },
      ],
    },
    {
      sessionId: 'demo_3', expertName: 'Demo Uzman C', startedAt: '2026-04-11T08:00:00Z', submittedAt: '2026-04-11T08:50:00Z',
      needs: [
        { id: 'n1', text: 'Bakimverene destek', stage: 'processed', groupId: 'g1', groupName: 'Aile ve Bakim' },
        { id: 'n2', text: 'Ebeveynlik egitimi', stage: 'selected', groupId: 'g1', groupName: 'Aile ve Bakim' },
        { id: 'n3', text: 'Internet baglantisi', stage: 'selected', groupId: 'g2', groupName: 'Dijital Erisim' },
        { id: 'n8', text: 'Okul yemegi', stage: 'processed', groupId: 'g3', groupName: 'Egitim ve Gelisim' },
        { id: 'n13', text: 'Dijital ortamda guvenlik', stage: 'selected', groupId: 'g4', groupName: 'Guvenlik ve Koruma' },
        { id: 'n15', text: 'Temel saglik hizmetleri', stage: 'selected', groupId: 'g5', groupName: 'Saglik ve Refah' },
        { id: 'n26', text: 'Gida ve beslenme', stage: 'selected', groupId: 'g7', groupName: 'Temel Yasam' },
        { id: 'n29', text: 'Kira ve barinma destegi', stage: 'processed', groupId: 'g7', groupName: 'Temel Yasam' },
        { id: 'n32', text: 'Guvenli okul servisi', stage: 'selected', groupId: 'g8', groupName: 'Ulasim ve Mobilite' },
      ],
      groups: [
        { id: 'g1', name: 'Aile ve Bakim', stage: 'selected' },
        { id: 'g2', name: 'Dijital Erisim', stage: 'pool' },
        { id: 'g3', name: 'Egitim ve Gelisim', stage: 'processed' },
        { id: 'g4', name: 'Guvenlik ve Koruma', stage: 'pool' },
        { id: 'g5', name: 'Saglik ve Refah', stage: 'selected' },
        { id: 'g7', name: 'Temel Yasam', stage: 'selected' },
        { id: 'g8', name: 'Ulasim ve Mobilite', stage: 'pool' },
      ],
    },
  ], []);

  const [sessions] = useState(demoSessions);
  const updateNeed = useCallback(async () => {}, []);
  const fetchData = useCallback(async () => {}, []);

  return {
    sessions, loading: false, error: null,
    lastFetch: new Date(), fetchData, updateNeed,
  };
}

// ─── Analysis Computations ──────────────────────────────────────────────────

function useAnalysis(sessions: SessionData[]) {
  return useMemo(() => {
    if (sessions.length === 0) return null;

    // Tüm unique ihtiyaçlar ve gruplar
    const allNeedIds = new Set<string>();
    const allGroupNames = new Set<string>();
    sessions.forEach(s => {
      s.needs.forEach(n => {
        allNeedIds.add(n.id);
        if (n.groupName) allGroupNames.add(n.groupName);
      });
    });

    // Kategori bazlı analiz
    const groupStats: Record<string, {
      name: string;
      totalSelections: number;       // selected + processed (havuzdan çıkan)
      selectedCount: number;
      processedCount: number;
      poolCount: number;
      expertCount: number;           // kaç uzman bu gruptan en az 1 ihtiyaç seçmiş
      needs: Record<string, { text: string; selectedBy: string[]; processedBy: string[]; poolBy: string[] }>;
    }> = {};

    sessions.forEach(s => {
      const expertGroupTouched = new Set<string>();

      s.needs.forEach(n => {
        const gName = n.groupName || 'Grupsuz';
        if (!groupStats[gName]) {
          groupStats[gName] = {
            name: gName, totalSelections: 0,
            selectedCount: 0, processedCount: 0, poolCount: 0,
            expertCount: 0, needs: {},
          };
        }
        const g = groupStats[gName];

        if (!g.needs[n.id]) {
          g.needs[n.id] = { text: n.text, selectedBy: [], processedBy: [], poolBy: [] };
        }

        if (n.stage === 'selected') {
          g.selectedCount++;
          g.totalSelections++;
          g.needs[n.id].selectedBy.push(s.expertName);
          expertGroupTouched.add(gName);
        } else if (n.stage === 'processed') {
          g.processedCount++;
          g.totalSelections++;
          g.needs[n.id].processedBy.push(s.expertName);
          expertGroupTouched.add(gName);
        } else {
          g.poolCount++;
          g.needs[n.id].poolBy.push(s.expertName);
        }
      });

      expertGroupTouched.forEach(gName => {
        groupStats[gName].expertCount++;
      });
    });

    // En çok seçilen ihtiyaçlar (selected + processed)
    const needPopularity: Record<string, {
      id: string; text: string; groupName: string;
      selectedCount: number; processedCount: number; totalCount: number;
      experts: string[];
    }> = {};

    sessions.forEach(s => {
      s.needs.forEach(n => {
        if (n.stage === 'pool') return;
        if (!needPopularity[n.id]) {
          needPopularity[n.id] = {
            id: n.id, text: n.text, groupName: n.groupName || 'Grupsuz',
            selectedCount: 0, processedCount: 0, totalCount: 0, experts: [],
          };
        }
        const np = needPopularity[n.id];
        np.totalCount++;
        if (n.stage === 'selected') np.selectedCount++;
        if (n.stage === 'processed') np.processedCount++;
        np.experts.push(s.expertName);
      });
    });

    // Uzman bazlı özet
    const expertSummary = sessions.map(s => {
      const selected = s.needs.filter(n => n.stage === 'selected').length;
      const processed = s.needs.filter(n => n.stage === 'processed').length;
      const pool = s.needs.filter(n => n.stage === 'pool').length;
      const groupsUsed = new Set(s.needs.filter(n => n.stage !== 'pool').map(n => n.groupName)).size;
      return {
        sessionId: s.sessionId,
        expertName: s.expertName,
        submittedAt: s.submittedAt,
        selected,
        processed,
        pool,
        total: selected + processed,
        groupsUsed,
      };
    });

    // Ortak seçimler (consensus)
    const consensus = Object.values(needPopularity)
      .filter(n => n.totalCount >= 2)
      .sort((a, b) => b.totalCount - a.totalCount);

    return {
      groupStats: Object.values(groupStats).sort((a, b) => b.totalSelections - a.totalSelections),
      needPopularity: Object.values(needPopularity).sort((a, b) => b.totalCount - a.totalCount),
      expertSummary,
      consensus,
      totalExperts: sessions.length,
      totalUniqueNeeds: allNeedIds.size,
      totalGroups: allGroupNames.size,
    };
  }, [sessions]);
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color }: {
  icon: typeof Users; label: string; value: string | number; color: string;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center gap-4">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  </div>
);

// ─── Category Analysis Section ──────────────────────────────────────────────

const CategorySection = ({ groupStats, totalExperts }: {
  groupStats: ReturnType<typeof useAnalysis> extends null ? never : NonNullable<ReturnType<typeof useAnalysis>>['groupStats'];
  totalExperts: number;
}) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const barData = groupStats.map(g => ({
    name: g.name.length > 12 ? g.name.slice(0, 12) + '...' : g.name,
    fullName: g.name,
    Secim: g.selectedCount,
    Donusum: g.processedCount,
    Havuz: g.poolCount,
  }));

  const radarData = groupStats.map(g => ({
    category: g.name.length > 10 ? g.name.slice(0, 10) + '...' : g.name,
    fullName: g.name,
    uzmanOrani: Math.round((g.expertCount / totalExperts) * 100),
    secimSayisi: g.totalSelections,
  }));

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Kategori Bazli Asama Dagilimi
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Secim" fill="#38a020" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Donusum" fill="#2060c0" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Havuz" fill="#d4a820" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Uzman Ilgi Orani (%)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Radar name="Uzman Orani %" dataKey="uzmanOrani" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Accordion */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 p-5 pb-3 flex items-center gap-2">
          <Folder className="w-4 h-4 text-indigo-600" />
          Kategori Detaylari
        </h3>
        <div className="border-t border-slate-100">
          {groupStats.map((g, idx) => (
            <div key={g.name} className={idx > 0 ? 'border-t border-slate-100' : ''}>
              <button
                onClick={() => setExpandedGroup(expandedGroup === g.name ? null : g.name)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <ChevronRight
                  className="w-4 h-4 text-slate-400 transition-transform duration-150 shrink-0"
                  style={{ transform: expandedGroup === g.name ? 'rotate(90deg)' : 'rotate(0)' }}
                />
                <span className="flex-1 text-sm font-semibold text-slate-700">{g.name}</span>
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                    Secim: {g.selectedCount}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                    Donusum: {g.processedCount}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                    {g.expertCount}/{totalExperts} uzman
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {expandedGroup === g.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pl-12">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-100">
                            <th className="text-left py-2 font-medium">Ihtiyac</th>
                            <th className="text-center py-2 font-medium w-24">Secen</th>
                            <th className="text-center py-2 font-medium w-24">Donusturen</th>
                            <th className="text-center py-2 font-medium w-24">Havuzda</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(g.needs).map(([nid, n]: [string, { text: string; selectedBy: string[]; processedBy: string[]; poolBy: string[] }]) => (
                            <tr key={nid} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 text-slate-700 font-medium">{n.text}</td>
                              <td className="py-2 text-center">
                                {n.selectedBy.length > 0 && (
                                  <span className="text-green-700" title={n.selectedBy.join(', ')}>
                                    {n.selectedBy.length}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-center">
                                {n.processedBy.length > 0 && (
                                  <span className="text-blue-700" title={n.processedBy.join(', ')}>
                                    {n.processedBy.length}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-center">
                                {n.poolBy.length > 0 && (
                                  <span className="text-amber-700" title={n.poolBy.join(', ')}>
                                    {n.poolBy.length}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Consensus Section ──────────────────────────────────────────────────────

const ConsensusSection = ({ consensus, totalExperts }: {
  consensus: NonNullable<ReturnType<typeof useAnalysis>>['consensus'];
  totalExperts: number;
}) => {
  const pieData = [
    { name: 'Ortak Secim (2+)', value: consensus.length },
    { name: 'Tekil Secim', value: 0 }, // placeholder
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-indigo-600" />
        Uzman Uzlasmasi (2+ uzmanin sectigi ihtiyaclar)
      </h3>
      {consensus.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">Henuz ortak secim yok</p>
      ) : (
        <div className="space-y-2">
          {consensus.map(n => {
            const pct = Math.round((n.totalCount / totalExperts) * 100);
            return (
              <div key={n.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{n.text}</p>
                  <p className="text-[10px] text-slate-400">{n.groupName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct >= 80 ? '#2e7020' : pct >= 50 ? '#d4a820' : '#94a3b8' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-16 text-right">
                    {n.totalCount}/{totalExperts} (%{pct})
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {n.selectedCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">{n.selectedCount}S</span>
                  )}
                  {n.processedCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{n.processedCount}D</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Expert Detail Panel (Inline Edit) ──────────────────────────────────────

const ExpertDetailPanel = ({ session, onUpdate, onClose }: {
  session: SessionData;
  onUpdate: (needId: string, field: string, value: string) => void;
  onClose: () => void;
}) => {
  const [editingNeed, setEditingNeed] = useState<string | null>(null);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');

  const startEdit = (needId: string, field: string, currentValue: string) => {
    setEditingNeed(needId);
    setEditField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingNeed && editField) {
      onUpdate(editingNeed, editField, editValue);
      setEditingNeed(null);
    }
  };

  const cancelEdit = () => {
    setEditingNeed(null);
    setEditField('');
    setEditValue('');
  };

  const groupedNeeds = useMemo(() => {
    const groups: Record<string, NeedRecord[]> = {};
    session.needs.forEach(n => {
      const gName = n.groupName || 'Grupsuz';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(n);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [session]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-xl border border-slate-200 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{session.expertName}</h3>
          <p className="text-[10px] text-slate-400">
            Gonderim: {new Date(session.submittedAt).toLocaleString('tr-TR')}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-4">
        {groupedNeeds.map(([groupName, needs]) => (
          <div key={groupName}>
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">{groupName}</span>
              <span className="text-[10px] text-slate-400">({needs.length})</span>
            </div>
            <div className="space-y-1 pl-5">
              {needs.map(n => (
                <div key={n.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 group">
                  {/* Stage badge */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: STAGE_CONFIG[n.stage].color }}
                    title={STAGE_CONFIG[n.stage].label}
                  />

                  {/* Need text */}
                  {editingNeed === n.id && editField === 'text' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        autoFocus
                        className="flex-1 text-xs border-b border-indigo-400 bg-transparent outline-none py-0.5"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <button onClick={saveEdit}><Check className="w-3 h-3 text-green-600" /></button>
                      <button onClick={cancelEdit}><X className="w-3 h-3 text-red-500" /></button>
                    </div>
                  ) : (
                    <span className="flex-1 text-xs text-slate-700">{n.text}</span>
                  )}

                  {/* Stage edit */}
                  {editingNeed === n.id && editField === 'stage' ? (
                    <div className="flex items-center gap-1">
                      {(['pool', 'selected', 'processed'] as Stage[]).map(s => (
                        <button
                          key={s}
                          onClick={() => { setEditValue(s); }}
                          className="text-[9px] px-2 py-0.5 rounded-full font-medium border transition-all"
                          style={{
                            background: editValue === s ? STAGE_CONFIG[s].color : 'transparent',
                            color: editValue === s ? 'white' : STAGE_CONFIG[s].color,
                            borderColor: STAGE_CONFIG[s].color,
                          }}
                        >
                          {STAGE_CONFIG[s].label}
                        </button>
                      ))}
                      <button onClick={saveEdit}><Check className="w-3 h-3 text-green-600" /></button>
                      <button onClick={cancelEdit}><X className="w-3 h-3 text-red-500" /></button>
                    </div>
                  ) : (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${STAGE_CONFIG[n.stage].color}20`, color: STAGE_CONFIG[n.stage].color }}
                    >
                      {STAGE_CONFIG[n.stage].label}
                    </span>
                  )}

                  {/* Edit buttons */}
                  {editingNeed !== n.id && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(n.id, 'text', n.text)}
                        className="p-1 rounded hover:bg-slate-200"
                        title="Metni duzenle"
                      >
                        <Edit2 className="w-3 h-3 text-slate-400" />
                      </button>
                      <button
                        onClick={() => startEdit(n.id, 'stage', n.stage)}
                        className="p-1 rounded hover:bg-slate-200"
                        title="Asamayi degistir"
                      >
                        <Layers className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Expert List ────────────────────────────────────────────────────────────

const ExpertList = ({ sessions, selectedSession, onSelect }: {
  sessions: SessionData[];
  selectedSession: string | null;
  onSelect: (id: string | null) => void;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
      <Users className="w-4 h-4 text-indigo-600" />
      Uzman Oturumlari
    </h3>
    <div className="space-y-2">
      {sessions.map(s => {
        const selected = s.needs.filter(n => n.stage === 'selected').length;
        const processed = s.needs.filter(n => n.stage === 'processed').length;
        const isActive = selectedSession === s.sessionId;

        return (
          <button
            key={s.sessionId}
            onClick={() => onSelect(isActive ? null : s.sessionId)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
              isActive
                ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-slate-700">{s.expertName}</span>
              <Eye className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-500' : 'text-slate-300'}`} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span>{new Date(s.submittedAt).toLocaleDateString('tr-TR')}</span>
              <span className="text-slate-300">|</span>
              <span className="text-green-600 font-medium">{selected} secim</span>
              <span className="text-blue-600 font-medium">{processed} donusum</span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Export ─────────────────────────────────────────────────────────────────

function exportCSV(sessions: SessionData[]) {
  const headers = ['Uzman', 'Ihtiyac ID', 'Ihtiyac', 'Asama', 'Grup', 'Gonderim Tarihi'];
  const rows = sessions.flatMap(s =>
    s.needs.map(n => [
      s.expertName, n.id, n.text, n.stage, n.groupName || '', s.submittedAt,
    ])
  );
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ihtiyac-analizi_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main App ───────────────────────────────────────────────────────────────

type Tab = 'overview' | 'categories' | 'experts';

export default function App() {
  const hasScript = !!APPS_SCRIPT_URL;
  const liveData = useSheetData();
  const demoData = useDemoData();
  const { sessions, loading, error, lastFetch, fetchData, updateNeed } = hasScript ? liveData : demoData;

  const analysis = useAnalysis(sessions);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const selectedSessionData = selectedSession
    ? sessions.find(s => s.sessionId === selectedSession) || null
    : null;

  const handleUpdateNeed = useCallback((needId: string, field: string, value: string) => {
    if (selectedSession) {
      updateNeed(selectedSession, needId, field, value);
    }
  }, [selectedSession, updateNeed]);

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'Genel Bakis', icon: TrendingUp },
    { id: 'categories', label: 'Kategori Analizi', icon: Folder },
    { id: 'experts', label: 'Uzman Detaylari', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-800">MagnetiX Analist</h1>
              <p className="text-[10px] text-slate-400">Ihtiyac Analizi Dashboard</p>
            </div>
          </div>

          {!hasScript && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] text-amber-700 font-medium">Demo modu — .env dosyasinda VITE_APPS_SCRIPT_URL ayarlayin</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Tabs */}
          <nav className="flex bg-slate-100 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {lastFetch && (
              <span className="text-[10px] text-slate-400">
                Son: {lastFetch.toLocaleTimeString('tr-TR')}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportCSV(sessions)}
              disabled={sessions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-600 mb-1">Henuz veri yok</h2>
            <p className="text-sm text-slate-400 max-w-md">
              Uzmanlar calismalarini gonderdikce burada veriler gorunecektir.
            </p>
          </div>
        ) : analysis && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <StatCard icon={Users} label="Toplam Uzman" value={analysis.totalExperts} color="#6366f1" />
                  <StatCard icon={Layers} label="Toplam Ihtiyac (Secilen)" value={analysis.needPopularity.length} color="#38a020" />
                  <StatCard icon={Folder} label="Kategori Sayisi" value={analysis.totalGroups} color="#d4a820" />
                  <StatCard icon={TrendingUp} label="Ortak Secim" value={analysis.consensus.length} color="#2060c0" />
                </div>

                {/* Consensus */}
                <ConsensusSection consensus={analysis.consensus} totalExperts={analysis.totalExperts} />

                {/* Top Needs Pie */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    En Cok Secilen 10 Ihtiyac
                  </h3>
                  <div className="flex gap-6">
                    <ResponsiveContainer width="50%" height={280}>
                      <PieChart>
                        <Pie
                          data={analysis.needPopularity.slice(0, 10)}
                          dataKey="totalCount"
                          nameKey="text"
                          cx="50%" cy="50%"
                          outerRadius={100}
                          label={({ text, percent }) =>
                            `${text.length > 15 ? text.slice(0, 15) + '...' : text} (${(percent * 100).toFixed(0)}%)`
                          }
                          labelLine
                        >
                          {analysis.needPopularity.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {analysis.needPopularity.slice(0, 10).map((n, i) => (
                        <div key={n.id} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-slate-700 flex-1 truncate">{n.text}</span>
                          <span className="text-[10px] text-slate-400">{n.groupName}</span>
                          <span className="text-xs font-bold text-slate-600">{n.totalCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expert Summary Table */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Uzman Ozeti
                  </h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-200">
                        <th className="text-left py-2 font-medium">Uzman</th>
                        <th className="text-center py-2 font-medium">Secim</th>
                        <th className="text-center py-2 font-medium">Donusum</th>
                        <th className="text-center py-2 font-medium">Havuzda</th>
                        <th className="text-center py-2 font-medium">Toplam Aktif</th>
                        <th className="text-center py-2 font-medium">Kullanilan Grup</th>
                        <th className="text-left py-2 font-medium">Gonderim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.expertSummary.map(e => (
                        <tr key={e.sessionId} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 font-semibold text-slate-700">{e.expertName}</td>
                          <td className="py-2 text-center text-green-600 font-medium">{e.selected}</td>
                          <td className="py-2 text-center text-blue-600 font-medium">{e.processed}</td>
                          <td className="py-2 text-center text-amber-600">{e.pool}</td>
                          <td className="py-2 text-center font-bold text-slate-700">{e.total}</td>
                          <td className="py-2 text-center text-slate-500">{e.groupsUsed}</td>
                          <td className="py-2 text-slate-500">
                            {new Date(e.submittedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <CategorySection groupStats={analysis.groupStats} totalExperts={analysis.totalExperts} />
            )}

            {/* Experts Tab */}
            {activeTab === 'experts' && (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1">
                  <ExpertList
                    sessions={sessions}
                    selectedSession={selectedSession}
                    onSelect={setSelectedSession}
                  />
                </div>
                <div className="col-span-2">
                  <AnimatePresence mode="wait">
                    {selectedSessionData ? (
                      <ExpertDetailPanel
                        key={selectedSessionData.sessionId}
                        session={selectedSessionData}
                        onUpdate={handleUpdateNeed}
                        onClose={() => setSelectedSession(null)}
                      />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-slate-200"
                      >
                        <Eye className="w-8 h-8 text-slate-200 mb-3" />
                        <p className="text-sm text-slate-400">Detay gormek icin bir uzman secin</p>
                        <p className="text-[10px] text-slate-300 mt-1">Ihtiyaclari inline olarak duzenleyebilirsiniz</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
