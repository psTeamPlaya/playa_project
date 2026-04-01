import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Sun, Wind, Waves, Heart, Calendar, Clock, Palmtree, Dog, Car } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen font-sans">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-tropical-blue/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-tropical-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-tropical-blue/30">
              <Palmtree size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-tropical-dark">PlayaFinder</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 font-bold text-tropical-dark/70">
            <Link to="/search" className="hover:text-tropical-blue transition-colors">Search</Link>
            <Link to="/favorites" className="hover:text-tropical-blue transition-colors">Favorites</Link>
            <Link to="/login" className="bg-tropical-dark text-white px-6 py-2.5 rounded-full hover:bg-tropical-blue transition-all shadow-lg shadow-tropical-dark/20">Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80" 
            alt="Tropical Beach" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-tropical-dark/40 via-transparent to-white"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-2xl leading-tight">
            Your perfect beach <br />
            <span className="text-tropical-blue">is waiting for you.</span>
          </h1>
          <p className="text-xl text-white/90 mb-12 font-medium drop-shadow-lg max-w-2xl mx-auto">
            We check weather, waves, and wind in real-time so you can just enjoy the sun.
          </p>

          {/* Search Box */}
          <div className="bg-white p-4 md:p-6 rounded-3xl shadow-2xl shadow-tropical-dark/30 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="text-left">
              <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-2 ml-1">What's the plan?</label>
              <div className="relative">
                <select className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 font-bold text-tropical-dark appearance-none focus:ring-2 focus:ring-tropical-blue transition-all">
                  <option>Sunbathing</option>
                  <option>Surfing</option>
                  <option>Windsurfing</option>
                  <option>Snorkeling</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-tropical-dark/30">
                  <Waves size={16} />
                </div>
              </div>
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-2 ml-1">When?</label>
              <div className="relative">
                <div className="w-full bg-gray-50 rounded-2xl py-3 px-4 font-bold text-tropical-dark flex items-center gap-2">
                  <Calendar size={18} className="text-tropical-blue" />
                  <span>Today</span>
                </div>
              </div>
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black uppercase text-tropical-dark/40 mb-2 ml-1">Time?</label>
              <div className="relative">
                <div className="w-full bg-gray-50 rounded-2xl py-3 px-4 font-bold text-tropical-dark flex items-center gap-2">
                  <Clock size={18} className="text-tropical-blue" />
                  <span>12:00 PM</span>
                </div>
              </div>
            </div>
            <Link to="/search" className="bg-tropical-orange text-white h-[52px] rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-tropical-orange/30">
              <Search size={20} />
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* Top 3 Section */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <span className="text-tropical-orange font-black uppercase tracking-widest text-sm">Recommended for today</span>
            <h2 className="text-4xl md:text-5xl font-black text-tropical-dark mt-2">Top 3: Gran Canaria</h2>
          </div>
          <Link to="/search" className="text-tropical-blue font-bold flex items-center gap-2 hover:underline">
            See all beaches <Search size={18} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: 'Las Canteras', img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80', activity: 'Surfing & Sunbathing' },
            { name: 'Maspalomas', img: 'https://images.unsplash.com/photo-1506929199175-60903ee8b5a9?auto=format&fit=crop&w=800&q=80', activity: 'Dunes & Relax' },
            { name: 'Pozo Izquierdo', img: 'https://images.unsplash.com/photo-1513553404607-988bf2703777?auto=format&fit=crop&w=800&q=80', activity: 'Windsurfing' }
          ].map((beach, i) => (
            <Link to="/beach/1" key={i} className="group cursor-pointer">
              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl shadow-tropical-dark/10 mb-6">
                <img src={beach.img} alt={beach.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-tropical-dark/80 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex gap-2 mb-3">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white">
                      <Sun size={18} />
                    </div>
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white">
                      <Waves size={18} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">{beach.name}</h3>
                  <p className="text-white/70 font-bold text-sm">{beach.activity}</p>
                </div>
                <button className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white hover:text-tropical-orange transition-all">
                  <Heart size={24} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-tropical-blue/10 text-tropical-blue rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sun size={32} />
            </div>
            <h4 className="text-xl font-black mb-4 uppercase">Live Weather</h4>
            <p className="text-tropical-dark/60 font-medium">We fetch data from OpenMeteo so you know exactly when to head out.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-tropical-orange/10 text-tropical-orange rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Waves size={32} />
            </div>
            <h4 className="text-xl font-black mb-4 uppercase">Sea Conditions</h4>
            <p className="text-tropical-dark/60 font-medium">Wave height and wind strength tailored to your favorite activity.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-tropical-sand/10 text-tropical-sand rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Dog size={32} />
            </div>
            <h4 className="text-xl font-black mb-4 uppercase">Amenities</h4>
            <p className="text-tropical-dark/60 font-medium">Parking, showers, or dog-friendly? We have all the info.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-tropical-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-tropical-blue rounded-xl flex items-center justify-center text-white">
              <Palmtree size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter">PlayaFinder</span>
          </div>
          <div className="flex gap-8 font-bold text-white/50">
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">Facebook</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-white/30 text-sm font-bold">© 2026 PlayaFinder • Gran Canaria Edition</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
