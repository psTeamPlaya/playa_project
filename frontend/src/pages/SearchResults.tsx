import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Sun, Wind, Waves, Heart, Filter, Thermometer, Dog, Car, Palmtree, ChevronRight } from 'lucide-react';

const SearchResults: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-tropical-blue/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-tropical-blue rounded-lg flex items-center justify-center text-white">
              <Palmtree size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter text-tropical-dark">PlayaFinder</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="p-2 text-tropical-dark/60 hover:text-tropical-blue transition-colors">
              <Heart size={20} />
            </button>
            <Link to="/login" className="w-8 h-8 bg-tropical-dark rounded-full flex items-center justify-center text-white">
              <Search size={16} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-72 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-tropical-blue/5">
            <h3 className="text-lg font-black uppercase tracking-wider text-tropical-dark mb-6 flex items-center gap-2">
              <Filter size={20} className="text-tropical-blue" /> Filters
            </h3>
            
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-3">Beach Type</label>
                <div className="space-y-2">
                  {['Sand', 'Stone', 'Volcanic'].map(type => (
                    <label key={type} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-gray-200 text-tropical-blue focus:ring-tropical-blue transition-all" />
                      <span className="font-bold text-tropical-dark/70 group-hover:text-tropical-dark transition-colors">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-3">Wind Speed (m/s)</label>
                <input type="range" className="w-full accent-tropical-blue" />
                <div className="flex justify-between text-[10px] font-bold text-tropical-dark/30 mt-2">
                  <span>0</span><span>25+</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-3">Wave Height (m)</label>
                <input type="range" className="w-full accent-tropical-blue" />
                <div className="flex justify-between text-[10px] font-bold text-tropical-dark/30 mt-2">
                  <span>0</span><span>4+</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-3">Temperature (°C)</label>
                <input type="range" className="w-full accent-tropical-orange" />
                <div className="flex justify-between text-[10px] font-bold text-tropical-dark/30 mt-2">
                  <span>15</span><span>40+</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-3">UV Index</label>
                <input type="range" min="0" max="11" className="w-full accent-tropical-orange" />
                <div className="flex justify-between text-[10px] font-bold text-tropical-dark/30 mt-2">
                  <span>Low</span><span>Extreme</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-3">Amenities</label>
                <div className="space-y-2">
                  {[
                    { label: 'Food & Drinks', icon: <Sun size={14} /> },
                    { label: 'Surf Schools', icon: <Waves size={14} /> },
                    { label: 'Parking', icon: <Car size={14} /> },
                    { label: 'Dog Friendly', icon: <Dog size={14} /> }
                  ].map(item => (
                    <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-gray-200 text-tropical-blue focus:ring-tropical-blue transition-all" />
                      <span className="font-bold text-tropical-dark/70 group-hover:text-tropical-dark transition-colors">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Results List */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-tropical-dark">12 Beaches Found</h2>
              <p className="text-tropical-dark/40 font-bold text-sm">Recommended for: <span className="text-tropical-blue">Surfing</span></p>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-tropical-blue/5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-tropical-dark/40">Sort by:</span>
              <select className="bg-transparent border-none font-bold text-sm text-tropical-dark focus:ring-0 cursor-pointer">
                <option>Best Match</option>
                <option>Distance</option>
                <option>Temperature</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6">
            {[
              { name: 'Las Canteras', loc: 'Las Palmas', dist: '2.4km', temp: '24°C', waves: '1.2m', wind: '12km/h', img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80' },
              { name: 'Maspalomas', loc: 'San Bartolomé', dist: '45km', temp: '28°C', waves: '0.4m', wind: '8km/h', img: 'https://images.unsplash.com/photo-1506929199175-60903ee8b5a9?auto=format&fit=crop&w=800&q=80' },
              { name: 'Pozo Izquierdo', loc: 'Santa Lucía', dist: '32km', temp: '22°C', waves: '1.5m', wind: '35km/h', img: 'https://images.unsplash.com/photo-1513553404607-988bf2703777?auto=format&fit=crop&w=800&q=80' }
            ].map((beach, i) => (
              <Link to="/beach/1" key={i} className="group bg-white rounded-[2.5rem] overflow-hidden border border-tropical-blue/5 shadow-sm hover:shadow-xl hover:shadow-tropical-blue/10 transition-all flex flex-col md:flex-row">
                <div className="w-full md:w-72 h-56 md:h-auto overflow-hidden shrink-0">
                  <img src={beach.img} alt={beach.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="flex-1 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-2xl font-black text-tropical-dark uppercase tracking-tight">{beach.name}</h3>
                      <button className="text-tropical-dark/20 hover:text-tropical-orange transition-colors">
                        <Heart size={24} />
                      </button>
                    </div>
                    <p className="text-tropical-dark/40 font-bold text-sm flex items-center gap-1 mb-6">
                      <MapPin size={14} className="text-tropical-blue" /> {beach.loc} • {beach.dist} away
                    </p>
                    
                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className="bg-tropical-orange/5 px-4 py-2 rounded-2xl flex items-center gap-2">
                        <Thermometer size={16} className="text-tropical-orange" />
                        <span className="font-black text-tropical-orange">{beach.temp}</span>
                      </div>
                      <div className="bg-tropical-blue/5 px-4 py-2 rounded-2xl flex items-center gap-2">
                        <Waves size={16} className="text-tropical-blue" />
                        <span className="font-black text-tropical-blue">{beach.waves}</span>
                      </div>
                      <div className="bg-tropical-sand/5 px-4 py-2 rounded-2xl flex items-center gap-2">
                        <Wind size={16} className="text-tropical-sand" />
                        <span className="font-black text-tropical-sand">{beach.wind}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-tropical-dark/40">
                        <Dog size={16} />
                      </div>
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-tropical-dark/40">
                        <Car size={16} />
                      </div>
                    </div>
                    <span className="text-tropical-blue font-black uppercase text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Details <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SearchResults;
