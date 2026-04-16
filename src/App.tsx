/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragOverEvent, DragEndEvent,
  defaultDropAnimationSideEffects, useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  rectSortingStrategy, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'motion/react';
import {
  Plus, Trash2, Edit2, Check, X, Search,
  FolderPlus, Folder, RotateCcw, ChevronRight,
  Send, User, LogOut, Loader2, StickyNote, ArrowRight,
  Shield, Users, FileText, Eye,
} from 'lucide-react';
import { cn } from './lib/utils';
import { Need, Group, Stage, Level, L1Note } from './types';

// ─── Config ─────────────────────────────────────────────────────────────────

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

// ─── Session Types ──────────────────────────────────────────────────────────

type Role = 'expert' | 'moderator';

interface Session {
  id: string;
  expertName: string;
  role: Role;
  startedAt: string;
}

function generateSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Stage Config ────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<Stage, {
  label: string; bg: string; cardBg: string; border: string;
  accent: string; text: string; muted: string; shadow: string; dot: string;
}> = {
  pool: {
    label: 'Havuz',
    bg: '#f9f5ec',
    cardBg: '#fdfaf0',
    border: 'rgba(160,130,60,0.2)',
    accent: '#8a6a20',
    text: '#4a3a18',
    muted: '#8a7a50',
    shadow: 'none',
    dot: '#d4a820',
  },
  selected: {
    label: 'Tasnif',
    bg: '#f0faf0',
    cardBg: '#f0faf0',
    border: '#4a9a30',
    accent: '#2e7020',
    text: '#1a3a10',
    muted: '#4a7030',
    shadow: '0 2px 8px rgba(50,140,40,0.15)',
    dot: '#38a020',
  },
  processed: {
    label: 'Dönüşüm',
    bg: '#eef5fd',
    cardBg: '#eef5fd',
    border: '#2060b0',
    accent: '#1050a0',
    text: '#0a2560',
    muted: '#3060a0',
    shadow: '0 3px 12px rgba(20,80,180,0.18)',
    dot: '#2060c0',
  },
};

// ─── Level Config ────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<Level, { label: string; desc: string; color: string; icon: React.ReactNode }> = {
  L1: { label: 'L1 — Serbest Not', desc: 'Uzmanlar serbestçe ihtiyaç notları yazar', color: '#d4a820', icon: <StickyNote className="w-4 h-4" /> },
  L2: { label: 'L2 — Uzman Panosu', desc: 'Uzmanlar ihtiyaçları tasnif ve adlandırır', color: '#38a020', icon: <Users className="w-4 h-4" /> },
  L3: { label: 'L3 — Moderatör Panosu', desc: 'Moderatör uzlaşma taslağını düzenler', color: '#2060c0', icon: <Shield className="w-4 h-4" /> },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cardRotation(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (((h << 5) + h) ^ id.charCodeAt(i)) & 0x7fffffff;
  return ((h % 7) - 3) * 0.22;
}

// ─── Stage Card ───────────────────────────────────────────────────────────────

interface CardProps {
  need: Need;
  isDragging?: boolean;
  isOverlay?: boolean;
  onRename?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
}

const StageCard = React.forwardRef<HTMLDivElement, CardProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ need, isDragging, isOverlay, onRename, onDelete, style, ...props }, ref) => {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(need.text);
    const cfg = STAGE_CONFIG[need.stage];
    const rot = cardRotation(need.id);
    const isPool = need.stage === 'pool';

    const transform = [
      (style as React.CSSProperties & { transform?: string })?.transform ?? '',
      `rotate(${isOverlay ? rot * 3 : isPool ? rot : rot * 0.25}deg)`,
    ].filter(Boolean).join(' ');

    const save = () => { if (editText.trim()) { onRename?.(need.id, editText.trim()); setEditing(false); } };

    return (
      <div
        ref={ref}
        style={{
          ...style,
          transform,
          touchAction: 'none',
          background: cfg.cardBg,
          border: `${isPool ? '1px' : '1.5px'} solid ${cfg.border}`,
          boxShadow: isDragging ? 'none' : isOverlay ? '0 20px 50px rgba(0,0,0,0.3)' : cfg.shadow,
          opacity: isDragging ? 0.25 : 1,
        }}
        className={cn(
          'group relative select-none cursor-grab active:cursor-grabbing rounded-sm transition-all duration-150',
          isPool ? 'px-3 py-2' : 'px-4 py-3',
          !isDragging && 'hover:-translate-y-0.5 hover:shadow-md',
          isOverlay && 'scale-105',
        )}
        {...props}
      >
        {/* Consensus indicator */}
        {need.consensus !== undefined && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
            style={{ background: need.consensus >= 0.7 ? '#38a020' : need.consensus >= 0.4 ? '#d4a820' : '#e04040' }}>
            {Math.round(need.consensus * 100)}
          </div>
        )}

        {editing ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              style={{ borderColor: cfg.accent, color: cfg.text }}
              className="flex-1 bg-transparent border-b text-xs font-sans outline-none px-0.5"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={save}><Check className="w-3 h-3 text-green-600" /></button>
            <button onClick={() => setEditing(false)}><X className="w-3 h-3 text-red-500" /></button>
          </div>
        ) : (
          <p className={cn('leading-snug break-words', isPool ? 'text-xs text-[13px]' : 'text-sm font-semibold')}
            style={{ color: cfg.text }}>
            {need.text}
          </p>
        )}

        {!editing && (
          <div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); setEditing(true); }}
              className="p-1 rounded hover:bg-black/10"><Edit2 className="w-2.5 h-2.5" style={{ color: cfg.accent }} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete?.(need.id); }}
              className="p-1 rounded hover:bg-black/10"><Trash2 className="w-2.5 h-2.5" style={{ color: cfg.accent }} /></button>
          </div>
        )}
      </div>
    );
  },
);

const SortableCard = ({ need, onRename, onDelete }: CardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: need.id, data: { type: 'Need', need },
  });
  return (
    <StageCard
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      need={need} isDragging={isDragging}
      onRename={onRename} onDelete={onDelete}
      {...attributes} {...listeners}
    />
  );
};

// ─── Pool Group ───────────────────────────────────────────────────────────────

interface PoolGroupProps {
  group: Group; needs: Need[];
  onRenameNeed: (id: string, t: string) => void;
  onDeleteNeed: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onRenameGroup: (id: string, n: string) => void;
  defaultOpen?: boolean;
}

const PoolGroup = ({ group, needs, onRenameNeed, onDeleteNeed, onDeleteGroup, onRenameGroup, defaultOpen = false }: PoolGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const { setNodeRef: setSortable, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: group.id, data: { type: 'Group', group },
  });
  const { setNodeRef: setDrop } = useDroppable({ id: group.id, data: { type: 'Group', group } });
  const setRef = (el: HTMLElement | null) => { setSortable(el); setDrop(el); };

  return (
    <div ref={setRef} style={{ transform: CSS.Translate.toString(transform), transition, touchAction: 'none' }}
      className={cn('rounded border border-[rgba(160,130,60,0.15)] overflow-hidden', isDragging && 'opacity-40')}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgba(160,130,60,0.08)] cursor-pointer select-none"
        onClick={() => !editing && setOpen(v => !v)}>
        <div {...attributes} {...listeners} className="cursor-grab" onClick={e => e.stopPropagation()}>
          <ChevronRight className="w-3 h-3 text-[#8a6a20]/40" />
        </div>
        <div className="transition-transform duration-150 shrink-0"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight className="w-3 h-3 text-[#8a6a20]/50" />
        </div>
        <Folder className="w-3 h-3 text-[#8a6a20]/60 shrink-0" />
        {editing ? (
          <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
            <input autoFocus className="flex-1 bg-transparent border-b border-[#8a6a20] text-[11px] font-sans outline-none text-[#4a3a18]"
              value={editName} onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onRenameGroup(group.id, editName.trim()); setEditing(false); } if (e.key === 'Escape') setEditing(false); }} />
            <button onClick={() => { onRenameGroup(group.id, editName.trim()); setEditing(false); }}><Check className="w-3 h-3 text-green-600" /></button>
          </div>
        ) : (
          <span className="flex-1 text-[11px] font-sans text-[#4a3a18]/70 truncate">{group.name}</span>
        )}
        <span className="text-[10px] text-[#8a6a20]/50 shrink-0 mr-1">{needs.length}</span>
        <div className="flex shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => setEditing(true)} className="p-0.5 hover:text-[#4a3a18] text-[#8a6a20]/40"><Edit2 className="w-2.5 h-2.5" /></button>
          <button onClick={() => onDeleteGroup(group.id)} className="p-0.5 hover:text-red-500 text-[#8a6a20]/40"><Trash2 className="w-2.5 h-2.5" /></button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <SortableContext id={group.id} items={needs.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <div className="p-2 flex flex-col gap-1.5 bg-white/40">
                {needs.map(n => <SortableCard key={n.id} need={n} onRename={onRenameNeed} onDelete={onDeleteNeed} />)}
                {needs.length === 0 && (
                  <div className="py-2 text-center text-[10px] font-sans text-[#8a6a20]/30 border border-dashed border-[#8a6a20]/15 rounded-sm">
                    Buraya sürükleyin
                  </div>
                )}
              </div>
            </SortableContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Pool Panel (left) ────────────────────────────────────────────────────────

interface PoolPanelProps {
  needs: Need[]; groups: Group[]; searchQuery: string;
  onRenameNeed: (id: string, t: string) => void; onDeleteNeed: (id: string) => void;
  onDeleteGroup: (id: string) => void; onRenameGroup: (id: string, n: string) => void;
}

const PoolPanel = ({ needs, groups, searchQuery, onRenameNeed, onDeleteNeed, onDeleteGroup, onRenameGroup }: PoolPanelProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool', data: { type: 'Zone', stage: 'pool' } });
  const cfg = STAGE_CONFIG.pool;

  const poolGroups = groups.filter(g => g.stage === 'pool');
  const ungrouped  = needs.filter(n => n.stage === 'pool' && !n.groupId);
  const filtered   = searchQuery
    ? ungrouped.filter(n => n.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : ungrouped;

  const allItems = [...poolGroups.map(g => g.id), ...filtered.map(n => n.id)];

  return (
    <div className="flex flex-col h-full border-r border-[rgba(0,0,0,0.07)] transition-colors duration-200"
      style={{ background: isOver ? '#f5f0e0' : cfg.bg }}>
      <div className="px-3 py-3 border-b border-[rgba(0,0,0,0.06)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
          <span className="text-xs font-bold uppercase tracking-wider text-[#4a3a18]">İhtiyaç Havuzu</span>
          <span className="ml-auto text-[10px] text-[#8a6a20]/60 bg-[rgba(160,130,60,0.1)] px-1.5 py-0.5 rounded-sm">
            {needs.filter(n => n.stage === 'pool').length}
          </span>
        </div>
        <p className="text-[10px] text-[#8a6a20]/50 mt-0.5">Ham ihtiyaçlar — orta alana sürükle</p>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-2.5 py-2.5 custom-scrollbar">
        <SortableContext id="pool" items={allItems} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {poolGroups.map(g => (
              <PoolGroup key={g.id} group={g}
                needs={needs.filter(n => n.groupId === g.id && (
                  !searchQuery || n.text.toLowerCase().includes(searchQuery.toLowerCase())
                ))}
                onRenameNeed={onRenameNeed} onDeleteNeed={onDeleteNeed}
                onDeleteGroup={onDeleteGroup} onRenameGroup={onRenameGroup}
              />
            ))}
            {filtered.map(n => <SortableCard key={n.id} need={n} onRename={onRenameNeed} onDelete={onDeleteNeed} />)}
            {filtered.length === 0 && poolGroups.length === 0 && (
              <div className="py-8 text-center text-xs font-sans text-[#8a6a20]/40 border-2 border-dashed border-[#8a6a20]/15 rounded-sm">
                {searchQuery ? 'Sonuç bulunamadı' : 'Havuz boş'}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

// ─── Work Section (selected / processed) ─────────────────────────────────────

interface WorkSectionProps {
  stage: 'selected' | 'processed';
  needs: Need[]; groups: Group[];
  onRenameNeed: (id: string, t: string) => void; onDeleteNeed: (id: string) => void;
  onDeleteGroup: (id: string) => void; onRenameGroup: (id: string, n: string) => void;
  onCreateGroup: (stage: Stage) => void;
  isCreatingGroup: boolean;
  onStartCreatingGroup: (s: Stage) => void;
  onCancelCreatingGroup: () => void;
  newGroupName: string;
  onNewGroupNameChange: (v: string) => void;
}

const WorkSection = ({
  stage, needs, groups,
  onRenameNeed, onDeleteNeed, onDeleteGroup, onRenameGroup,
  onCreateGroup, isCreatingGroup, onStartCreatingGroup, onCancelCreatingGroup,
  newGroupName, onNewGroupNameChange,
}: WorkSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'Zone', stage } });
  const cfg = STAGE_CONFIG[stage];
  const zoneNeeds  = needs.filter(n => n.stage === stage && !n.groupId);
  const zoneGroups = groups.filter(g => g.stage === stage);
  const allItems   = [...zoneGroups.map(g => g.id), ...zoneNeeds.map(n => n.id)];

  return (
    <motion.div
      className="flex flex-col flex-1 min-h-0 rounded-xl border-2 overflow-hidden"
      animate={{
        borderColor: isOver ? cfg.accent : `${cfg.border}60`,
        background: isOver ? `${cfg.bg}cc` : cfg.bg,
        boxShadow: isOver ? `0 0 0 4px ${cfg.dot}25, 0 0 20px ${cfg.dot}15` : '0 0 0 0px transparent',
      }}
      transition={{ duration: 0.15 }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: `${cfg.border}25`, background: `${cfg.cardBg}88` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.accent }}>
          {cfg.label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
          style={{ background: `${cfg.dot}20`, color: cfg.accent }}>
          {needs.filter(n => n.stage === stage).length}
        </span>
        <button onClick={() => onStartCreatingGroup(stage)}
          className="ml-auto p-1 rounded transition-colors hover:bg-black/5" style={{ color: cfg.muted }}>
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {isCreatingGroup && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg border"
            style={{ background: 'white', borderColor: cfg.border }}>
            <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.accent }} />
            <input autoFocus placeholder="Grup ismi..."
              className="flex-1 bg-transparent border-b text-xs font-sans outline-none px-0.5"
              style={{ borderColor: cfg.accent, color: cfg.text }}
              value={newGroupName} onChange={e => onNewGroupNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onCreateGroup(stage); if (e.key === 'Escape') onCancelCreatingGroup(); }} />
            <button onClick={() => onCreateGroup(stage)} className="text-green-600"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={onCancelCreatingGroup} className="text-red-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <SortableContext id={stage} items={allItems} strategy={rectSortingStrategy}>
          <div className="flex flex-col gap-2">
            {zoneGroups.map(g => (
              <div key={g.id} className="rounded-lg border overflow-hidden"
                style={{ borderColor: `${cfg.border}40`, background: 'rgba(255,255,255,0.5)' }}>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                  style={{ color: cfg.accent, background: `${cfg.dot}10` }}>
                  <Folder className="w-3.5 h-3.5" />
                  <span className="flex-1">{g.name}</span>
                  <span className="opacity-50">{needs.filter(n => n.groupId === g.id).length}</span>
                  <button onClick={() => onDeleteGroup(g.id)} className="opacity-40 hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                </div>
                <SortableContext id={g.id} items={needs.filter(n => n.groupId === g.id).map(n => n.id)} strategy={rectSortingStrategy}>
                  <div className="p-2 grid grid-cols-2 gap-2">
                    {needs.filter(n => n.groupId === g.id).map(n => (
                      <SortableCard key={n.id} need={n} onRename={onRenameNeed} onDelete={onDeleteNeed} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2">
              {zoneNeeds.map(n => <SortableCard key={n.id} need={n} onRename={onRenameNeed} onDelete={onDeleteNeed} />)}
            </div>

            {zoneNeeds.length === 0 && zoneGroups.length === 0 && !isCreatingGroup && (
              <div className="py-10 text-center text-xs font-sans border-2 border-dashed rounded-xl"
                style={{ color: `${cfg.accent}50`, borderColor: `${cfg.border}30` }}>
                Havuzdan buraya sürükle
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </motion.div>
  );
};

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastItem { id: string; stage: Stage; }

const ToastContainer = ({ toasts }: { toasts: ToastItem[] }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div key={t.id}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-xl text-xs font-bold text-white"
          style={{ background: STAGE_CONFIG[t.stage].dot }}>
          <Check className="w-3.5 h-3.5" />
          {STAGE_CONFIG[t.stage].label}&apos;e eklendi
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// ─── New Card Modal ───────────────────────────────────────────────────────────

const NewCardModal = ({ onAdd, onClose }: { onAdd: (text: string) => void; onClose: () => void }) => {
  const [text, setText] = useState('');
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ duration: 0.15 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-white rounded-xl shadow-2xl p-5 border border-[rgba(0,0,0,0.08)]">
        <h3 className="text-sm font-sans font-bold text-[#2a1a05] mb-3">Yeni İhtiyaç Kartı</h3>
        <input autoFocus placeholder="İhtiyacı yazın..."
          className="w-full border-b-2 border-[#c4a060] bg-transparent outline-none py-1.5 text-sm font-sans text-[#2a1a05] placeholder-[#8a6a20]/40 mb-4"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); onClose(); } if (e.key === 'Escape') onClose(); }} />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">İptal</button>
          <button onClick={() => { if (text.trim()) { onAdd(text.trim()); onClose(); } }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-all active:scale-95"
            style={{ background: '#7a5020' }}>Havuza Ekle</button>
        </div>
      </motion.div>
    </>
  );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────

const LoginScreen = ({ onLogin }: { onLogin: (name: string, role: Role) => void }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('expert');
  return (
    <div className="h-screen flex items-center justify-center bg-[#f6f3ed] font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-96 bg-white rounded-2xl shadow-xl p-8 border border-[rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#7a5020] flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#2a1a05]">MagnetiX</h1>
            <p className="text-xs text-[#8a6a20]/60">İhtiyaç Analizi Panosu</p>
          </div>
        </div>

        <label className="block text-xs font-semibold text-[#4a3a18] mb-1.5">Adınız ve Soyadınız</label>
        <input
          autoFocus
          placeholder="Ör: Ayşe Yılmaz"
          className="w-full border-2 border-[#e8d890] rounded-lg bg-[#fdfaf0] outline-none py-2.5 px-3 text-sm font-sans text-[#2a1a05] placeholder-[#8a6a20]/30 mb-4 focus:border-[#7a5020] transition-colors"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onLogin(name.trim(), role); }}
        />

        <label className="block text-xs font-semibold text-[#4a3a18] mb-2">Rolünüz</label>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setRole('expert')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center gap-2',
              role === 'expert'
                ? 'border-[#7a5020] bg-[#7a5020] text-white'
                : 'border-[#e8d890] text-[#8a6a20] hover:bg-[#fdfaf0]'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Uzman
          </button>
          <button
            onClick={() => setRole('moderator')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center gap-2',
              role === 'moderator'
                ? 'border-[#2060b0] bg-[#2060b0] text-white'
                : 'border-[#c0d8f0] text-[#3060a0] hover:bg-[#eef5fd]'
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Moderatör
          </button>
        </div>

        <button
          onClick={() => { if (name.trim()) onLogin(name.trim(), role); }}
          disabled={!name.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: role === 'moderator' ? '#2060b0' : '#7a5020' }}
        >
          Panoya Giriş Yap
        </button>

        <p className="text-[10px] text-[#8a6a20]/40 text-center mt-4">
          Uzmanlar L1 ve L2&apos;de, moderatörler L3&apos;te çalışır.
        </p>
      </motion.div>
    </div>
  );
};

// ─── Submit Confirmation Modal ────────────────────────────────────────────────

const SubmitModal = ({ onConfirm, onClose, sending, title, description }: {
  onConfirm: () => void; onClose: () => void; sending: boolean;
  title?: string; description?: string;
}) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />
    <motion.div initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ duration: 0.15 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 bg-white rounded-xl shadow-2xl p-6 border border-[rgba(0,0,0,0.08)]">
      <h3 className="text-sm font-sans font-bold text-[#2a1a05] mb-2">{title || 'Çalışmayı Gönder'}</h3>
      <p className="text-xs text-[#8a6a20]/70 mb-5 leading-relaxed">
        {description || 'Mevcut çalışmanız kaydedilecektir.'}
      </p>
      <div className="flex gap-2">
        <button onClick={onClose} disabled={sending}
          className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
          İptal
        </button>
        <button onClick={onConfirm} disabled={sending}
          className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ background: '#2e7020' }}>
          {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gönderiliyor...</> : <><Send className="w-3.5 h-3.5" /> Gönder</>}
        </button>
      </div>
    </motion.div>
  </>
);

// ─── L1: Free Notes Screen ──────────────────────────────────────────────────

const L1NotesScreen = ({ session, onSubmitNotes }: {
  session: Session;
  onSubmitNotes: (notes: string[]) => void;
}) => {
  const [notes, setNotes] = useState<{ id: string; text: string }[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  const [sending, setSending] = useState(false);

  const addNote = () => {
    if (currentNote.trim()) {
      setNotes([...notes, { id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: currentNote.trim() }]);
      setCurrentNote('');
    }
  };

  const removeNote = (id: string) => setNotes(notes.filter(n => n.id !== id));
  const editNote = (id: string, text: string) => setNotes(notes.map(n => n.id === id ? { ...n, text } : n));

  const handleSubmit = async () => {
    setSending(true);
    const noteTexts = notes.map(n => n.text);

    if (APPS_SCRIPT_URL) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'L1_NOTES',
            sessionId: session.id,
            expertName: session.expertName,
            submittedAt: new Date().toISOString(),
            notes: noteTexts,
          }),
        });
      } catch (err) {
        console.error('Submit failed:', err);
      }
    }

    setSending(false);
    setShowSubmit(false);
    onSubmitNotes(noteTexts);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f6f3ed] font-sans">
      {/* Header */}
      <div className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-[rgba(0,0,0,0.07)] bg-white z-50">
        <h1 className="text-[15px] font-extrabold text-[#2a1a05] whitespace-nowrap shrink-0 tracking-tight">
          İhtiyaç <span className="text-[#d4a820]">Analizi</span>
          <span className="ml-2 text-[10px] font-semibold bg-[#d4a820]/15 text-[#8a6a20] px-2 py-0.5 rounded-sm">L1</span>
        </h1>
        <div className="w-px h-6 bg-[rgba(0,0,0,0.08)] shrink-0" />
        <div className="flex items-center gap-1.5 shrink-0">
          <User className="w-3.5 h-3.5 text-[#7a5020]" />
          <span className="text-xs font-semibold text-[#4a3a18]">{session.expertName}</span>
        </div>
        <div className="flex-1" />
        {notes.length > 0 && (
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-all active:scale-95 hover:opacity-90"
            style={{ background: '#2e7020' }}
          >
            <Send className="w-3.5 h-3.5" /> Notları Gönder ({notes.length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Note input */}
        <div className="w-1/2 p-6 flex flex-col border-r border-[rgba(0,0,0,0.07)]">
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="w-5 h-5 text-[#d4a820]" />
            <h2 className="text-sm font-bold text-[#4a3a18]">Serbest Notlar</h2>
          </div>
          <p className="text-xs text-[#8a6a20]/60 mb-4 leading-relaxed">
            Çocukların ihtiyaçları hakkında aklınıza gelen her şeyi yazın.
            Her bir ihtiyacı ayrı bir not olarak ekleyin.
          </p>

          <div className="flex gap-2 mb-4">
            <textarea
              autoFocus
              value={currentNote}
              onChange={e => setCurrentNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              placeholder="Bir ihtiyaç yazın... (Enter ile ekle)"
              className="flex-1 border-2 border-[#e8d890] rounded-lg bg-[#fdfaf0] outline-none py-3 px-4 text-sm font-sans text-[#2a1a05] placeholder-[#8a6a20]/30 focus:border-[#d4a820] transition-colors resize-none"
              rows={3}
            />
          </div>
          <button
            onClick={addNote}
            disabled={!currentNote.trim()}
            className="self-start flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#d4a820' }}
          >
            <Plus className="w-3.5 h-3.5" /> Not Ekle
          </button>
        </div>

        {/* Right: Notes list */}
        <div className="w-1/2 p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#8a6a20]" />
            <h2 className="text-sm font-bold text-[#4a3a18]">Eklenen Notlar ({notes.length})</h2>
          </div>

          {notes.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#8a6a20]/40 border-2 border-dashed border-[#8a6a20]/15 rounded-xl">
              Henüz not eklenmedi. Soldan yazmaya başlayın.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {notes.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={i} onRemove={removeNote} onEdit={editNote} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSubmit && (
          <SubmitModal
            onConfirm={handleSubmit}
            onClose={() => setShowSubmit(false)}
            sending={sending}
            title="Notları Gönder"
            description={`${notes.length} adet not gönderilecektir. Notlarınız L2 aşamasında sentez için kullanılacaktır.`}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NoteCard = ({ note, index, onRemove, onEdit }: {
  note: { id: string; text: string }; index: number;
  onRemove: (id: string) => void; onEdit: (id: string, text: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group bg-[#fdfaf0] border border-[rgba(160,130,60,0.2)] rounded-lg p-3 flex items-start gap-3"
    >
      <span className="text-[10px] font-bold text-[#8a6a20]/40 mt-0.5 shrink-0 w-5 text-center">{index + 1}</span>
      {editing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            autoFocus
            className="flex-1 bg-transparent border-b border-[#d4a820] text-xs font-sans outline-none text-[#4a3a18]"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onEdit(note.id, editText.trim()); setEditing(false); }
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <button onClick={() => { onEdit(note.id, editText.trim()); setEditing(false); }}><Check className="w-3 h-3 text-green-600" /></button>
          <button onClick={() => setEditing(false)}><X className="w-3 h-3 text-red-500" /></button>
        </div>
      ) : (
        <>
          <p className="flex-1 text-xs text-[#4a3a18] leading-relaxed">{note.text}</p>
          <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-black/10"><Edit2 className="w-3 h-3 text-[#8a6a20]" /></button>
            <button onClick={() => onRemove(note.id)} className="p-1 rounded hover:bg-black/10"><Trash2 className="w-3 h-3 text-[#8a6a20]" /></button>
          </div>
        </>
      )}
    </motion.div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentLevel, setCurrentLevel] = useState<Level>('L1');
  const [l1Submitted, setL1Submitted] = useState(false);
  const [needs,  setNeeds]  = useState<Need[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [preDragStage, setPreDragStage] = useState<Stage | null>(null);
  const [searchQuery, setSearch]  = useState('');
  const [showNewCard, setShowNewCard] = useState(false);
  const [creatingGroupStage, setCreatingGroupStage] = useState<Stage | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [allL1Notes, setAllL1Notes] = useState<L1Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // ─── Parse + dedup L1 notes in frontend ──────────────────────────────────
  const parseAndDedup = (rawNotes: L1Note[]): { text: string; sources: string; category: string }[] => {
    const itemMap: Record<string, { text: string; sources: Record<string, boolean>; category: string }> = {};

    for (const note of rawNotes) {
      const lines = String(note.text).split('\n');
      let currentCategory = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('-')) {
          const itemText = trimmed.replace(/^-\s*/, '').trim();
          if (!itemText || itemText === ',') continue;

          const normalized = itemText.toLowerCase()
            .replace(/[.,;:!?]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (!normalized) continue;

          if (!itemMap[normalized]) {
            itemMap[normalized] = { text: itemText, sources: {}, category: currentCategory };
          }
          itemMap[normalized].sources[note.expertName] = true;
        } else {
          currentCategory = trimmed;
        }
      }
    }

    const results = Object.values(itemMap).map(entry => ({
      text: entry.text,
      sources: Object.keys(entry.sources).join(', '),
      category: entry.category,
      sourceCount: Object.keys(entry.sources).length,
    }));

    results.sort((a, b) => b.sourceCount - a.sourceCount);
    return results;
  };

  // ─── Fetch raw L1 notes for L2, parse in frontend ─────────────────────────
  useEffect(() => {
    if (currentLevel === 'L2' && APPS_SCRIPT_URL) {
      setLoadingNotes(true);
      const timer = setTimeout(() => {
        fetch(`${APPS_SCRIPT_URL}?action=getL1Notes`)
          .then(r => r.json())
          .then(data => {
            const raw: L1Note[] = data.raw || data.notes || [];
            if (raw.length > 0) {
              setAllL1Notes(raw);
              const parsed = parseAndDedup(raw);
              const poolNeeds: Need[] = parsed.map((item, i) => ({
                id: `syn_${i}_${Math.random().toString(36).slice(2)}`,
                text: item.text,
                stage: 'pool' as Stage,
                originalNotes: [item.sources],
              }));
              setNeeds(poolNeeds);
              setGroups([]);
            }
            setLoadingNotes(false);
          })
          .catch(err => {
            console.error('Failed to fetch L1 notes:', err);
            setLoadingNotes(false);
          });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentLevel]);

  // ─── Fetch L2 results for L3 — consensus calculated in frontend ──────────
  useEffect(() => {
    if (currentLevel === 'L3' && APPS_SCRIPT_URL) {
      setLoadingNotes(true);
      fetch(`${APPS_SCRIPT_URL}?action=getL2Results`)
        .then(r => r.json())
        .then(data => {
          const expertResults: { expertName: string; needs: any[]; groups: any[] }[] = data.expertResults || [];

          if (expertResults.length === 0) {
            setNeeds([]);
            setGroups([]);
            setLoadingNotes(false);
            return;
          }

          const totalExperts = expertResults.length;

          // Build a map: normalized need text → { text, assignments: [{groupName, expertName}], stages[] }
          const needTextMap: Record<string, {
            text: string; id: string;
            assignments: { groupName: string; expertName: string }[];
            stages: string[];
          }> = {};
          const allGroupNames = new Set<string>();

          for (const er of expertResults) {
            const groupMap: Record<string, string> = {};
            for (const g of er.groups) { groupMap[g.id] = g.name; }

            for (const n of er.needs) {
              const key = n.text.trim().toLowerCase()
                .replace(/[.,;:!?]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
              if (!key) continue;

              if (!needTextMap[key]) {
                needTextMap[key] = { text: n.text, id: n.id, assignments: [], stages: [] };
              }
              const groupName = n.groupId ? (groupMap[n.groupId] || n.groupName || '') : '';
              needTextMap[key].assignments.push({ groupName, expertName: er.expertName });
              needTextMap[key].stages.push(n.stage || 'pool');
              if (groupName) allGroupNames.add(groupName);
            }
          }

          // Create merged groups
          const mergedGroups: Group[] = [];
          const groupNameToId: Record<string, string> = {};
          let gIdx = 0;
          for (const name of Array.from(allGroupNames)) {
            const gId = `mg_${gIdx++}`;
            groupNameToId[name] = gId;
            mergedGroups.push({ id: gId, name, stage: 'selected' });
          }

          // Create merged needs with consensus
          const mergedNeeds: Need[] = [];
          let nIdx = 0;
          for (const key of Object.keys(needTextMap)) {
            const entry = needTextMap[key];

            // Find most common group assignment
            const groupCounts: Record<string, number> = {};
            for (const a of entry.assignments) {
              if (a.groupName) {
                groupCounts[a.groupName] = (groupCounts[a.groupName] || 0) + 1;
              }
            }

            let bestGroup = '';
            let bestCount = 0;
            for (const gn of Object.keys(groupCounts)) {
              if (groupCounts[gn] > bestCount) {
                bestCount = groupCounts[gn];
                bestGroup = gn;
              }
            }

            const consensus = bestGroup ? Math.round((bestCount / totalExperts) * 100) / 100 : 0;

            // High consensus → pre-grouped in "selected", low → pool
            const isConsensus = consensus >= 0.7;
            mergedNeeds.push({
              id: `mn_${nIdx++}`,
              text: entry.text,
              stage: isConsensus ? 'selected' : 'pool',
              groupId: isConsensus && bestGroup ? groupNameToId[bestGroup] : undefined,
              consensus,
              originalNotes: entry.assignments.map(a => `${a.expertName}: ${entry.text}`),
            });
          }

          setNeeds(mergedNeeds);
          setGroups(mergedGroups);
          setLoadingNotes(false);
        })
        .catch(err => {
          console.error('Failed to fetch L2 results:', err);
          setLoadingNotes(false);
        });
    }
  }, [currentLevel]);

  const handleLogin = useCallback((name: string, role: Role) => {
    const s: Session = {
      id: generateSessionId(),
      expertName: name,
      role,
      startedAt: new Date().toISOString(),
    };
    setSession(s);
    // Moderators go directly to L3
    if (role === 'moderator') {
      setCurrentLevel('L3');
    } else {
      setCurrentLevel('L1');
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (window.confirm('Çıkış yapmak istediğinize emin misiniz? Kaydedilmemiş değişiklikler kaybolacaktır.')) {
      setSession(null);
      setNeeds([]);
      setGroups([]);
      setSubmitted(false);
      setL1Submitted(false);
      setCurrentLevel('L1');
    }
  }, []);

  const handleL1Submit = useCallback((noteTexts: string[]) => {
    setL1Submitted(true);
    // Auto-advance to L2 after a short delay to let the POST reach Sheets
    setCurrentLevel('L2');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    setSending(true);

    const payload = {
      type: currentLevel === 'L2' ? 'L2_BOARD' : 'L3_BOARD',
      sessionId: session.id,
      expertName: session.expertName,
      level: currentLevel,
      startedAt: session.startedAt,
      submittedAt: new Date().toISOString(),
      needs: needs.map(n => ({
        id: n.id,
        text: n.text,
        stage: n.stage,
        groupId: n.groupId || '',
        groupName: n.groupId ? groups.find(g => g.id === n.groupId)?.name || '' : '',
        consensus: n.consensus,
      })),
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        stage: g.stage,
      })),
    };

    try {
      if (APPS_SCRIPT_URL) {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ihtiyac-${currentLevel}_${session.expertName.replace(/\s+/g, '-')}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setSubmitted(true);
      setShowSubmit(false);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Gönderim sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  }, [session, needs, groups, currentLevel]);

  const showToast = (stage: Stage) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, stage }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2200);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string;
    setActiveId(id);
    setPreDragStage(needs.find(n => n.id === id)?.stage ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const aid = active.id as string, oid = over.id as string;
    if (aid === oid) return;

    const activeNeed  = needs.find(n => n.id === aid);
    const activeGroup = groups.find(g => g.id === aid);
    if (!activeNeed && !activeGroup) return;

    const overGroup = groups.find(g => g.id === oid);
    const overNeed  = needs.find(n => n.id === oid);

    let targetStage: Stage | null = null;
    let targetGroupId: string | undefined;

    if ((['pool','selected','processed'] as Stage[]).includes(oid as Stage)) {
      targetStage = oid as Stage;
    } else if (overGroup) {
      targetStage = overGroup.stage; targetGroupId = overGroup.id;
    } else if (overNeed) {
      targetStage = overNeed.stage; targetGroupId = overNeed.groupId;
    }

    if (targetStage) {
      if (activeNeed && (activeNeed.stage !== targetStage || activeNeed.groupId !== targetGroupId))
        setNeeds(p => p.map(n => n.id === aid ? { ...n, stage: targetStage!, groupId: targetGroupId } : n));
      else if (activeGroup && activeGroup.stage !== targetStage) {
        setGroups(p => p.map(g => g.id === aid ? { ...g, stage: targetStage! } : g));
        setNeeds(p => p.map(n => n.groupId === aid ? { ...n, stage: targetStage! } : n));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) { setPreDragStage(null); return; }
    const aid = active.id as string, oid = over.id as string;

    if (active.data.current?.type === 'Need') {
      const finalNeed = needs.find(n => n.id === aid);
      if (finalNeed && finalNeed.stage !== 'pool' && finalNeed.stage !== preDragStage) {
        showToast(finalNeed.stage);
      }
    }
    setPreDragStage(null);

    if (aid === oid) return;
    if (active.data.current?.type === 'Need')
      setNeeds(p => { const oi = p.findIndex(n => n.id === aid), ni = p.findIndex(n => n.id === oid); return ni === -1 ? p : arrayMove(p, oi, ni); });
    else if (active.data.current?.type === 'Group')
      setGroups(p => { const oi = p.findIndex(g => g.id === aid), ni = p.findIndex(g => g.id === oid); return ni === -1 ? p : arrayMove(p, oi, ni); });
  };

  const addNeed    = (text: string) => setNeeds(p => [...p, { id: Math.random().toString(36).slice(2), text, stage: 'pool' }]);
  const deleteNeed = (id: string)   => setNeeds(p => p.filter(n => n.id !== id));
  const renameNeed = (id: string, text: string) => setNeeds(p => p.map(n => n.id === id ? { ...n, text } : n));
  const deleteGroup = (id: string)  => { setGroups(p => p.filter(g => g.id !== id)); setNeeds(p => p.map(n => n.groupId === id ? { ...n, groupId: undefined } : n)); };
  const renameGroup = (id: string, name: string) => setGroups(p => p.map(g => g.id === id ? { ...g, name } : g));
  const createGroup = (stage: Stage) => {
    if (newGroupName.trim()) {
      setGroups(p => [...p, { id: Math.random().toString(36).slice(2), name: newGroupName.trim(), stage }]);
      setNewGroupName(''); setCreatingGroupStage(null);
    }
  };

  const activeNeed  = activeId ? needs.find(n => n.id === activeId)  : null;
  const activeGroup = activeId ? groups.find(g => g.id === activeId) : null;

  const workProps = {
    needs, groups,
    onRenameNeed: renameNeed, onDeleteNeed: deleteNeed,
    onDeleteGroup: deleteGroup, onRenameGroup: renameGroup,
    onCreateGroup: createGroup,
    onCancelCreatingGroup: () => { setCreatingGroupStage(null); setNewGroupName(''); },
    newGroupName, onNewGroupNameChange: setNewGroupName,
  };

  // ─── Login Gate ───────────────────────────────────────────────────────────
  if (!session) return <LoginScreen onLogin={handleLogin} />;

  // ─── L1: Free Notes ───────────────────────────────────────────────────────
  if (currentLevel === 'L1' && session.role === 'expert') {
    return <L1NotesScreen session={session} onSubmitNotes={handleL1Submit} />;
  }

  // ─── L2 / L3: Board ──────────────────────────────────────────────────────
  const levelCfg = LEVEL_CONFIG[currentLevel];

  // Loading screen while fetching synthesized notes
  if (loadingNotes && (currentLevel === 'L2' || currentLevel === 'L3')) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f6f3ed] font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-[#38a020] animate-spin" />
          <h2 className="text-sm font-bold text-[#4a3a18]">
            {currentLevel === 'L3' ? 'Uzlaşma Hesaplanıyor...' : 'Notlar Sentezleniyor...'}
          </h2>
          <p className="text-xs text-[#8a6a20]/60 text-center max-w-xs">
            {currentLevel === 'L3'
              ? 'Uzmanların L2 tasnif sonuçları karşılaştırılıyor ve uzlaşma hesaplanıyor.'
              : 'Tüm uzmanların L1 notları yapay zeka ile birleştiriliyor.'}
            <br />
            Bu işlem birkaç saniye sürebilir.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f6f3ed] font-sans">
      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>

        {/* ─── Top Band ─── */}
        <div className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-[rgba(0,0,0,0.07)] bg-white z-50">
          <h1 className="text-[15px] font-extrabold text-[#2a1a05] whitespace-nowrap shrink-0 tracking-tight">
            İhtiyaç <span style={{ color: levelCfg.color }}>Analizi</span>
            <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-sm"
              style={{ background: `${levelCfg.color}15`, color: levelCfg.color }}>
              {currentLevel}
            </span>
          </h1>

          <div className="w-px h-6 bg-[rgba(0,0,0,0.08)] shrink-0" />

          {/* Level stepper */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {(['L1', 'L2', 'L3'] as Level[]).map((level, i) => {
              const lcfg = LEVEL_CONFIG[level];
              const isCurrent = level === currentLevel;
              const isPast = (['L1', 'L2', 'L3'] as Level[]).indexOf(currentLevel) > i;
              const isClickable = isPast || (level === 'L2' && l1Submitted && session.role === 'expert');

              return (
                <React.Fragment key={level}>
                  {i > 0 && (
                    <div className="flex-1 h-px min-w-[12px] max-w-[40px] transition-colors duration-500"
                      style={{ background: isPast ? lcfg.color : 'rgba(0,0,0,0.1)' }} />
                  )}
                  <button
                    onClick={() => isClickable && setCurrentLevel(level)}
                    disabled={!isClickable && !isCurrent}
                    className={cn(
                      'flex items-center gap-1.5 shrink-0 transition-all',
                      isClickable && 'cursor-pointer hover:opacity-80',
                      !isClickable && !isCurrent && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300"
                      style={{
                        background: isCurrent || isPast ? lcfg.color : 'rgba(0,0,0,0.07)',
                        color: isCurrent || isPast ? 'white' : 'rgba(0,0,0,0.3)',
                        boxShadow: isCurrent ? `0 0 0 3px ${lcfg.color}30` : 'none',
                      }}>
                      {i + 1}
                    </div>
                    <span className="text-[11px] font-medium hidden sm:block transition-colors duration-300"
                      style={{ color: isCurrent || isPast ? lcfg.color : 'rgba(0,0,0,0.3)' }}>
                      {level}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Expert info */}
          <div className="flex items-center gap-1.5 shrink-0">
            {session.role === 'moderator' ? <Shield className="w-3.5 h-3.5 text-[#2060b0]" /> : <User className="w-3.5 h-3.5 text-[#7a5020]" />}
            <span className="text-xs font-semibold text-[#4a3a18]">{session.expertName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
              style={{
                background: session.role === 'moderator' ? '#2060b0/10' : '#7a5020/10',
                color: session.role === 'moderator' ? '#2060b0' : '#7a5020',
              }}>
              {session.role === 'moderator' ? 'Moderatör' : 'Uzman'}
            </span>
            {submitted && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm font-medium ml-1">
                Gönderildi
              </span>
            )}
          </div>

          <div className="w-px h-6 bg-[rgba(0,0,0,0.08)] shrink-0" />

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input placeholder="Ara..." value={searchQuery} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs rounded-md bg-slate-50 border border-slate-200 outline-none focus:border-amber-400 w-32 transition-colors" />
            </div>
            <button onClick={() => setShowNewCard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-all active:scale-95 hover:opacity-90"
              style={{ background: '#7a5020' }}>
              <Plus className="w-3.5 h-3.5" /> Yeni Kart
            </button>
            <button onClick={() => setShowSubmit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-all active:scale-95 hover:opacity-90"
              style={{ background: '#2e7020' }}>
              <Send className="w-3.5 h-3.5" /> Gönder
            </button>
            <button onClick={handleLogout}
              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Çıkış">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2-panel layout for L2 (pool + single board), 3-panel for L3 */}
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[22%] min-w-[200px] max-w-[280px] flex flex-col">
            <PoolPanel needs={needs} groups={groups} searchQuery={searchQuery}
              onRenameNeed={renameNeed} onDeleteNeed={deleteNeed}
              onDeleteGroup={deleteGroup} onRenameGroup={renameGroup} />
          </div>
          <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
            {currentLevel === 'L2' ? (
              /* L2: Single board — only "selected" stage for classification */
              <WorkSection stage="selected"
                isCreatingGroup={creatingGroupStage === 'selected'}
                onStartCreatingGroup={s => setCreatingGroupStage(s)}
                {...workProps} />
            ) : (
              /* L3: Two boards — selected + processed */
              <>
                <WorkSection stage="selected"
                  isCreatingGroup={creatingGroupStage === 'selected'}
                  onStartCreatingGroup={s => setCreatingGroupStage(s)}
                  {...workProps} />
                <WorkSection stage="processed"
                  isCreatingGroup={creatingGroupStage === 'processed'}
                  onStartCreatingGroup={s => setCreatingGroupStage(s)}
                  {...workProps} />
              </>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.3' } } }) }}>
          {activeNeed  ? <StageCard need={activeNeed}  isOverlay /> : null}
          {activeGroup ? (
            <div className="w-48 rounded-lg p-3 bg-white shadow-2xl border border-[rgba(0,0,0,0.1)] scale-105">
              <div className="flex items-center gap-2 mb-2">
                <Folder className="w-4 h-4 text-[#8a6a20]" />
                <span className="text-sm font-sans font-bold text-[#2a1a05]">{activeGroup.name}</span>
              </div>
              {needs.filter(n => n.groupId === activeGroup.id).slice(0, 3).map((n, i) => (
                <div key={n.id} className="h-1.5 rounded-sm mb-1 bg-[#e8d890]" style={{ width: `${85 - i * 15}%` }} />
              ))}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Card Modal */}
      <AnimatePresence>
        {showNewCard && <NewCardModal onAdd={addNeed} onClose={() => setShowNewCard(false)} />}
      </AnimatePresence>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmit && (
          <SubmitModal
            onConfirm={handleSubmit}
            onClose={() => setShowSubmit(false)}
            sending={sending}
            title={currentLevel === 'L2' ? 'Uzman Çalışmasını Gönder' : 'Moderatör Çalışmasını Gönder'}
            description={
              currentLevel === 'L2'
                ? 'Tasnif ve adlandırma çalışmanız kaydedilecektir. Diğer uzmanlarla birlikte uzlaşma hesaplanacaktır.'
                : 'Moderatör olarak son halinizi verdiğiniz pano kaydedilecektir.'
            }
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} />
    </div>
  );
}