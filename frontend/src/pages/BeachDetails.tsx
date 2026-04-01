import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, MapPin, Sun, Wind, Waves, Heart, Thermometer, Dog, Car, Palmtree, ChevronLeft, Star, Clock, Calendar, ShieldAlert } from 'lucide-react';

const BeachDetails: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-tropical-blue/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/search" className="flex items-center gap-2 text-tropical-dark/60 hover:text-tropical-blue transition-colors font-bold">
            <ChevronLeft size={20} /> Back to Search
          </Link>
          <div className="flex items-center gap-4">
            <button className="p-2 text-tropical-dark/60 hover:text-tropical-orange transition-colors">
              <Heart size={24} />
            </button>
            <Link to="/" className="w-10 h-10 bg-tropical-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-tropical-blue/30">
              <Palmtree size={24} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-tropical-blue/10 text-tropical-blue px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">Top Rated</span>
              <div className="flex items-center gap-1 text-tropical-orange">
                <Star size={14} fill="currentColor" />
                <span className="font-black text-sm">4.8 (124 reviews)</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-tropical-dark uppercase tracking-tighter leading-none mb-4">Las Canteras</h1>
            <p className="text-xl text-tropical-dark/40 font-bold flex items-center gap-2">
              <MapPin size={20} className="text-tropical-blue" /> Las Palmas de Gran Canaria, Spain
            </p>
          </div>
          <div className="flex gap-4">
            <button className="bg-tropical-dark text-white px-8 py-4 rounded-3xl font-black uppercase tracking-wider hover:bg-tropical-blue transition-all shadow-xl shadow-tropical-dark/20">
              Add Review
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="md:col-span-2 aspect-video rounded-[3rem] overflow-hidden shadow-2xl shadow-tropical-dark/10">
            <img src="https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80" alt="Las Canteras" className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-rows-2 gap-6">
            <div className="rounded-[2.5rem] overflow-hidden shadow-xl shadow-tropical-dark/5">
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80" alt="Beach View" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-[2.5rem] overflow-hidden shadow-xl shadow-tropical-dark/5 relative">
              <img src="https://images.unsplash.com/photo-1506929199175-60903ee8b5a9?auto=format&fit=crop&w=600&q=80" alt="Beach View" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-tropical-dark/40 flex items-center justify-center">
                <span className="text-white font-black text-2xl">+12 Photos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-3xl font-black text-tropical-dark uppercase tracking-tight mb-6 border-b-4 border-tropical-blue/10 pb-4 inline-block">About the Beach</h2>
              <p className="text-xl text-tropical-dark/60 font-medium leading-relaxed">
                Las Canteras is one of the best urban beaches in the world. It features a natural rock barrier (La Barra) 
                that protects part of the beach from waves, making it perfect for swimming, while the southern part 
                (La Cicer) is a paradise for surfers.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-black text-tropical-dark uppercase tracking-tight mb-8 border-b-4 border-tropical-blue/10 pb-4 inline-block">Activities & Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { label: 'Sunbathing', icon: <Sun size={32} />, color: 'bg-tropical-orange/10 text-tropical-orange' },
                  { label: 'Surfing', icon: <Waves size={32} />, color: 'bg-tropical-blue/10 text-tropical-blue' },
                  { label: 'Snorkeling', icon: <Palmtree size={32} />, color: 'bg-tropical-sand/10 text-tropical-sand' },
                  { label: 'Dog Friendly', icon: <Dog size={32} />, color: 'bg-gray-100 text-gray-400' },
                  { label: 'Parking', icon: <Car size={32} />, color: 'bg-gray-100 text-gray-400' }
                ].map(item => (
                  <div key={item.label} className={`${item.color} p-8 rounded-[2.5rem] text-center flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform cursor-default`}>
                    {item.icon}
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-3xl font-black text-tropical-dark uppercase tracking-tight mb-8 border-b-4 border-tropical-blue/10 pb-4 inline-block">Recent Reviews</h2>
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="bg-gray-50 p-8 rounded-[2.5rem] border border-tropical-blue/5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-tropical-blue rounded-2xl flex items-center justify-center text-white font-black">JK</div>
                        <div>
                          <p className="font-black text-tropical-dark">John Kowalski</p>
                          <p className="text-xs text-tropical-dark/40 font-bold uppercase">2 days ago</p>
                        </div>
                      </div>
                      <div className="flex text-tropical-orange">
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} size={14} fill={star <= 4 ? "currentColor" : "none"} />)}
                      </div>
                    </div>
                    <p className="text-tropical-dark/70 font-medium italic">"Great place, but it gets very crowded on weekends. The water is crystal clear near the barrier!"</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Weather */}
          <aside className="space-y-8">
            <div className="bg-tropical-dark text-white p-10 rounded-[3rem] shadow-2xl shadow-tropical-dark/30 sticky top-24">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Live Weather</h3>
                <div className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">OpenMeteo</div>
              </div>
              
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-tropical-orange">
                      <Thermometer size={24} />
                    </div>
                    <span className="font-bold text-white/60 uppercase text-xs tracking-widest">Temperature</span>
                  </div>
                  <span className="text-4xl font-black">24°C</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-tropical-blue">
                      <Waves size={24} />
                    </div>
                    <span className="font-bold text-white/60 uppercase text-xs tracking-widest">Wave Height</span>
                  </div>
                  <span className="text-4xl font-black">1.2m</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-tropical-sand">
                      <Wind size={24} />
                    </div>
                    <span className="font-bold text-white/60 uppercase text-xs tracking-widest">Wind Speed</span>
                  </div>
                  <span className="text-4xl font-black">15km/h</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-red-400">
                      <ShieldAlert size={24} />
                    </div>
                    <span className="font-bold text-white/60 uppercase text-xs tracking-widest">UV Index</span>
                  </div>
                  <span className="text-4xl font-black text-red-400">High</span>
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-white/10">
                <div className="flex items-center gap-4 mb-6">
                  <Clock size={20} className="text-white/40" />
                  <span className="font-bold text-white/60 uppercase text-xs tracking-widest">Best time to visit</span>
                </div>
                <p className="text-xl font-black text-tropical-blue">10:00 AM - 2:00 PM</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 py-20 mt-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-tropical-blue rounded-xl flex items-center justify-center text-white">
              <Palmtree size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-tropical-dark">PlayaFinder</span>
          </div>
          <p className="text-tropical-dark/30 text-sm font-bold uppercase tracking-widest">© 2026 PlayaFinder • Gran Canaria Edition</p>
        </div>
      </footer>
    </div>
  );
};

export default BeachDetails;
