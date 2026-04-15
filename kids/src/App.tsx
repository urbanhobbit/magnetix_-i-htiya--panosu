import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Heart, Send, ArrowLeft } from 'lucide-react';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

interface Item {
  id: string;
  text: string;
  emoji: string;
}

const PRESET_ITEMS: Item[] = [
  { id: 'k1', text: 'Kitap', emoji: '📚' },
  { id: 'k2', text: 'Bilgisayar', emoji: '💻' },
  { id: 'k3', text: 'Tablet', emoji: '📱' },
  { id: 'k4', text: 'İnternet', emoji: '🌐' },
  { id: 'k5', text: 'Yemek', emoji: '🍎' },
  { id: 'k6', text: 'Kıyafet', emoji: '👕' },
  { id: 'k7', text: 'Spor', emoji: '⚽' },
  { id: 'k8', text: 'Müzik', emoji: '🎵' },
  { id: 'k9', text: 'Resim', emoji: '🎨' },
  { id: 'k10', text: 'Okul', emoji: '🏫' },
  { id: 'k11', text: 'Doktor', emoji: '🩺' },
  { id: 'k12', text: 'Oyun', emoji: '🎮' },
  { id: 'k13', text: 'Arkadaş', emoji: '🤝' },
  { id: 'k14', text: 'Park', emoji: '🌳' },
  { id: 'k15', text: 'Sinema', emoji: '🎬' },
  { id: 'k16', text: 'Konser', emoji: '🎤' },
  { id: 'k17', text: 'Bebek', emoji: '🧸' },
  { id: 'k18', text: 'Bisiklet', emoji: '🚲' },
  { id: 'k19', text: 'Kamplar', emoji: '⛺' },
  { id: 'k20', text: 'Yüzme', emoji: '🏊' },
];

const COLORS = [
  'bg-yellow-200 border-yellow-400',
  'bg-pink-200 border-pink-400',
  'bg-blue-200 border-blue-400',
  'bg-green-200 border-green-400',
  'bg-purple-200 border-purple-400',
  'bg-orange-200 border-orange-400',
  'bg-teal-200 border-teal-400',
  'bg-red-200 border-red-400',
];

function ItemCard({ item, onRemove, showRemove, onClick }: { item: Item; onRemove?: () => void; showRemove?: boolean; onClick?: () => void }) {
  const colorIndex = parseInt(item.id.slice(1)) % COLORS.length;
  
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      onClick={onClick}
      className={`
        ${COLORS[colorIndex]}
        border-4 rounded-2xl p-4
        flex items-center gap-3 text-lg font-bold text-gray-800
        shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95
      `}
    >
      <span className="text-3xl">{item.emoji}</span>
      <span className="flex-1">{item.text}</span>
      {showRemove && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-8 h-8 rounded-full bg-white/50 hover:bg-red-400 flex items-center justify-center text-xl"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

function App() {
  const [name, setName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const poolItems = PRESET_ITEMS.filter(item => !selectedItems.find(s => s.id === item.id));
  
  const addItem = (item: Item) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
    }
  };
  
  const removeFromSelected = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };
  
  const sendToSheets = async () => {
    if (!name.trim() || selectedItems.length === 0) return;
    
    setSending(true);
    
    const payload = {
      sessionId: `child_${Date.now()}`,
      expertName: name,
      groups: [{ id: 'kids', name: 'Çocuk İhtiyaçları', stage: 'selected' }],
      needs: selectedItems.map(item => ({
        id: item.id,
        text: item.text,
        groupId: 'kids',
        stage: 'selected',
      })),
    };
    
    if (APPS_SCRIPT_URL) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error('Sheets error:', e);
      }
    }
    
    setSending(false);
    setSent(true);
  };
  
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="text-center"
        >
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-4xl font-black text-purple-600 mb-4">Teşekkürler!</h1>
          <p className="text-xl text-gray-600">Senin isteklerini kaydettik!</p>
        </motion.div>
      </div>
    );
  }
  
  if (showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white/80 backdrop-blur rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">Merhaba!</h1>
          <p className="text-gray-600 mb-6">İsmin ne?</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="İsmini yaz"
            className="w-full text-xl p-4 rounded-2xl border-4 border-purple-300 focus:border-purple-500 outline-none text-center"
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && setShowNameInput(false)}
          />
          <button
            onClick={() => name.trim() && setShowNameInput(false)}
            className="mt-4 bg-gradient-to-r from-pink-400 to-purple-500 text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Başlayalım! 🎮
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-4 md:p-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNameInput(true)}
            className="p-3 rounded-full bg-white/50 hover:bg-white shadow"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Merhaba, {name}! 👋</h1>
            <p className="text-gray-600">İstediğin şeyleri seç</p>
          </div>
        </div>
        
        {selectedItems.length > 0 && (
          <button
            onClick={sendToSheets}
            disabled={sending}
            className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Gönder {sending ? '...' : ''}
          </button>
        )}
      </header>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur rounded-3xl p-6 shadow-xl">
          <h2 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <Heart className="text-pink-500 w-8 h-8" />
            İstediklerim ({selectedItems.length})
          </h2>
          
          <div className="min-h-[300px]">
            {selectedItems.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <Star className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p className="text-lg">Buraya şeyler koyabilirsin!</p>
              </div>
            ) : (
              <div className="space-3">
                <AnimatePresence>
                  {selectedItems.map(item => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      showRemove 
                      onRemove={() => removeFromSelected(item.id)} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur rounded-3xl p-6 shadow-xl">
          <h2 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <Star className="text-yellow-500 w-8 h-8" />
            Şeyler ({poolItems.length})
          </h2>
          
          <div className="space-3 max-h-[500px] overflow-y-auto pr-2">
            {poolItems.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onClick={() => addItem(item)} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;