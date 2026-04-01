import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Search, MapPin, Sun, Wind, Waves, Heart, User, Menu, X, Calendar, Clock, Filter, Thermometer, Dog, Car, Palmtree } from 'lucide-react';

// --- Wireframe Components ---

const Header = () => (
  <header className="border-b border-black p-4 flex justify-between items-center bg-white">
    <Link to="/wireframe" className="text-xl font-bold uppercase tracking-tighter">PlayaFinder [LOGO]</Link>
    <nav className="hidden md:flex gap-6">
      <Link to="/wireframe/search" className="hover:underline">Szukaj</Link>
      <Link to="/wireframe/favorites" className="hover:underline">Ulubione</Link>
      <Link to="/wireframe/login" className="hover:underline">Zaloguj</Link>
    </nav>
    <Menu className="md:hidden" />
  </header>
);

const Footer = () => (
  <footer className="border-t border-black p-8 mt-12 bg-gray-50 text-center">
    <p className="font-bold">PlayaFinder © 2026</p>
    <p className="text-sm mt-2">[NEEDS: Social Media Links]</p>
    <p className="text-sm">[NEEDS: Contact Email]</p>
  </footer>
);

// --- Pages ---

const Home = () => (
  <div className="p-4 max-w-4xl mx-auto">
    {/* Hero Section */}
    <section className="border-2 border-black p-12 my-8 text-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-4 uppercase">Znajdź idealną plażę na dziś</h1>
      <p className="mb-8">Wybierz co chcesz robić, a my sprawdzimy pogodę i fale.</p>
      
      <div className="border border-black p-6 bg-white inline-block text-left w-full max-w-md">
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase mb-1">Co planujesz?</label>
          <select className="w-full border border-black p-2 bg-white">
            <option>Opalanie</option>
            <option>Surfing</option>
            <option>Windsurfing</option>
            <option>Spacer</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Kiedy?</label>
            <div className="border border-black p-2 flex items-center gap-2">
              <Calendar size={16} />
              <span>Dzisiaj</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Godzina?</label>
            <div className="border border-black p-2 flex items-center gap-2">
              <Clock size={16} />
              <span>12:00</span>
            </div>
          </div>
        </div>
        <Link to="/wireframe/search" className="block w-full bg-black text-white text-center py-3 font-bold uppercase hover:bg-gray-800">
          Szukaj plaży
        </Link>
      </div>
    </section>

    {/* Top 3 Recommendations */}
    <section className="my-12">
      <h2 className="text-2xl font-bold mb-6 uppercase border-b-2 border-black pb-2">Top 3 na dziś (Gran Canaria)</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-black p-4">
            <div className="aspect-video bg-gray-200 border border-black mb-4 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-400">X</span>
            </div>
            <h3 className="font-bold text-lg uppercase">Plaża {i === 1 ? 'Las Canteras' : i === 2 ? 'Maspalomas' : 'Pozo Izquierdo'}</h3>
            <div className="flex gap-2 my-2">
              <Sun size={16} /> <Waves size={16} /> <Wind size={16} />
            </div>
            <p className="text-sm mb-4">Idealne warunki do: {i === 3 ? 'Windsurfingu' : 'Opalania'}</p>
            <Link to="/wireframe/beach/1" className="text-sm font-bold underline">Zobacz szczegóły</Link>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const SearchResults = () => (
  <div className="p-4 max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
    {/* Filters Sidebar */}
    <aside className="w-full md:w-64 border border-black p-4 h-fit">
      <h3 className="font-bold uppercase mb-4 flex items-center gap-2">
        <Filter size={18} /> Filtry
      </h3>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Typ plaży</label>
          <div className="space-y-1">
            <label className="flex items-center gap-2"><input type="checkbox" /> Piasek</label>
            <label className="flex items-center gap-2"><input type="checkbox" /> Kamienie</label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Wiatr (m/s)</label>
          <input type="range" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Fale (m)</label>
          <input type="range" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Temperatura (°C)</label>
          <input type="range" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Indeks UV</label>
          <input type="range" min="0" max="11" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Udogodnienia</label>
          <div className="space-y-1">
            <label className="flex items-center gap-2"><input type="checkbox" /> Jedzenie</label>
            <label className="flex items-center gap-2"><input type="checkbox" /> Szkoły surfingu</label>
            <label className="flex items-center gap-2"><input type="checkbox" /> Prysznice</label>
            <label className="flex items-center gap-2"><input type="checkbox" /> Parking</label>
            <label className="flex items-center gap-2"><input type="checkbox" /> Przyjazne psom</label>
          </div>
        </div>
      </div>
    </aside>

    {/* Results List */}
    <main className="flex-1">
      <div className="flex justify-between items-end mb-6 border-b border-black pb-2">
        <h2 className="text-2xl font-bold uppercase">Wyniki (12 plaż)</h2>
        <span className="text-sm">Sortuj wg: Trafność</span>
      </div>
      <div className="grid gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-black p-4 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 aspect-video bg-gray-200 border border-black flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-gray-400">X</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="font-bold text-xl uppercase">Plaża Przykładowa {i}</h3>
                <Heart size={20} />
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                <MapPin size={14} /> Las Palmas, Gran Canaria (5km stąd)
              </p>
              <div className="flex gap-4 my-3">
                <div className="text-center border border-black px-2 py-1">
                  <Sun size={16} className="mx-auto" />
                  <span className="text-[10px] font-bold">24°C</span>
                </div>
                <div className="text-center border border-black px-2 py-1">
                  <Waves size={16} className="mx-auto" />
                  <span className="text-[10px] font-bold">1.2m</span>
                </div>
                <div className="text-center border border-black px-2 py-1">
                  <Wind size={16} className="mx-auto" />
                  <span className="text-[10px] font-bold">12km/h</span>
                </div>
              </div>
              <p className="text-sm line-clamp-2">Krótki opis plaży, który zachęca do odwiedzenia. Piękny piasek i świetne warunki do nauki surfingu...</p>
              <Link to="/wireframe/beach/1" className="inline-block mt-4 font-bold underline uppercase text-sm">Szczegóły</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
);

const BeachDetails = () => (
  <div className="p-4 max-w-4xl mx-auto">
    <Link to="/wireframe/search" className="text-sm underline mb-4 inline-block">← Powrót do wyników</Link>
    
    <div className="border-2 border-black p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold uppercase">Las Canteras</h1>
          <p className="flex items-center gap-1 text-gray-600"><MapPin size={16} /> Las Palmas de Gran Canaria</p>
        </div>
        <button className="border border-black p-2 flex items-center gap-2 font-bold uppercase text-sm">
          <Heart size={18} /> Dodaj do ulubionych
        </button>
      </div>

      <div className="aspect-video bg-gray-200 border border-black mb-8 flex items-center justify-center">
        <span className="text-6xl font-bold text-gray-400">X</span>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="font-bold uppercase border-b border-black mb-4">O plaży</h2>
          <p className="mb-6">
            Las Canteras to jedna z najlepszych plaż miejskich na świecie. Posiada naturalną barierę skalną (La Barra), 
            która chroni część plaży przed falami, czyniąc ją idealną do pływania, podczas gdy południowa część (La Cicer) 
            jest rajem dla surferów.
          </p>
          
          <h2 className="font-bold uppercase border-b border-black mb-4">Aktywności i Udogodnienia</h2>
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="border border-black p-3 text-center w-24">
              <Sun size={24} className="mx-auto mb-1" />
              <span className="text-[10px] font-bold uppercase">Opalanie</span>
            </div>
            <div className="border border-black p-3 text-center w-24">
              <Waves size={24} className="mx-auto mb-1" />
              <span className="text-[10px] font-bold uppercase">Surfing</span>
            </div>
            <div className="border border-black p-3 text-center w-24">
              <Palmtree size={24} className="mx-auto mb-1" />
              <span className="text-[10px] font-bold uppercase">Snorkeling</span>
            </div>
            <div className="border border-black p-3 text-center w-24">
              <Dog size={24} className="mx-auto mb-1" />
              <span className="text-[10px] font-bold uppercase">Psy OK</span>
            </div>
            <div className="border border-black p-3 text-center w-24">
              <Car size={24} className="mx-auto mb-1" />
              <span className="text-[10px] font-bold uppercase">Parking</span>
            </div>
          </div>

          <h2 className="font-bold uppercase border-b border-black mb-4">Opinie [NEEDS: Supabase]</h2>
          <div className="space-y-4">
            <div className="border border-black p-4">
              <p className="font-bold text-sm">Jan Kowalski ★★★★☆</p>
              <p className="text-sm italic">"Świetne miejsce, ale w weekendy bardzo tłoczno."</p>
            </div>
          </div>
        </div>

        <aside>
          <div className="border border-black p-4 bg-gray-50">
            <h3 className="font-bold uppercase mb-4 text-center border-b border-black pb-2">Pogoda Teraz</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Temperatura:</span>
                <span className="text-xl font-bold">24°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Wiatr:</span>
                <span className="text-xl font-bold">15 km/h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Fale:</span>
                <span className="text-xl font-bold">0.8m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">UV:</span>
                <span className="text-xl font-bold text-red-600">Wysokie</span>
              </div>
            </div>
            <p className="text-[10px] mt-4 text-center uppercase font-bold">[Dane z OpenMeteo]</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
);

const Login = () => (
  <div className="p-4 max-w-md mx-auto my-12">
    <div className="border-2 border-black p-8 bg-white">
      <h1 className="text-2xl font-bold uppercase mb-6 text-center">Zaloguj się</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Email</label>
          <input type="email" className="w-full border border-black p-2" placeholder="twoj@email.com" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Hasło</label>
          <input type="password" className="w-full border border-black p-2" placeholder="********" />
        </div>
        <button className="w-full bg-black text-white py-3 font-bold uppercase hover:bg-gray-800">
          Zaloguj
        </button>
        <div className="text-center text-sm mt-4">
          Nie masz konta? <Link to="/wireframe/register" className="underline font-bold">Zarejestruj się</Link>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-black text-center">
        <p className="text-xs font-bold uppercase mb-4">Lub przez</p>
        <button className="w-full border border-black py-2 font-bold uppercase flex items-center justify-center gap-2">
          <User size={18} /> Google [NEEDS: Supabase Auth]
        </button>
      </div>
    </div>
  </div>
);

const Wireframe: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <Header />
      <main>
        <Routes>
          <Route index element={<Home />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="beach/:id" element={<BeachDetails />} />
          <Route path="login" element={<Login />} />
          <Route path="*" element={<Navigate to="/wireframe" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default Wireframe;
