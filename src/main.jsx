import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { categories, previewMenu, fetchMenu, liveMenuEnabled, keralaDate, isSpecial, isAvailable, formatPrice, dishMedia } from './menu.js';
import { Icon } from './Icon.jsx';
import { DishCard, DishDialog } from './Dining.jsx';
import './styles.css';
import './dining.css';
import './discovery.css';

const allCategories = [['all', 'All dishes', 'all'], ...categories];
const table = new URLSearchParams(window.location.search).get('table')?.trim();
const tableLabel = table && /^[a-z0-9-]{1,12}$/i.test(table) ? table.toUpperCase() : null;
function App() {
  const [category, setCategory] = useState('all');
  const [diet, setDiet] = useState('all');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(liveMenuEnabled ? [] : previewMenu);
  const [status, setStatus] = useState(liveMenuEnabled ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [date, setDate] = useState(() => keralaDate.format(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setDate(keralaDate.format(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!liveMenuEnabled) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let active = true;
    fetchMenu(controller.signal).then((menu) => {
      if (!active) return;
      setItems(menu);
      setStatus('ready');
    }).catch(() => {
      if (active) setStatus('error');
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const picks = items.filter((item) => item.featured && isAvailable(item)).slice(0, 3);
  const featured = picks.find((item) => dishMedia(item).images.length > 0) ?? picks[0];
  const heroPhoto = featured && (dishMedia(featured).images[1] ?? dishMedia(featured).images[0]);
  const selectedDish = items.find((item) => item.id === selectedId);
  const pairing = items.find((item) => item.id === selectedDish?.pairing?.id && isAvailable(item));
  const openDish = (item) => setSelectedId(item.id);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hasFilters = category !== 'all' || diet !== 'all' || words.length > 0;
  const sectionName = allCategories.find(([id]) => id === category)?.[1];
  const results = items.filter((item) => {
    const categoryMatches = category === 'all' || (category === 'special' ? isSpecial(item, date) : item.category === category);
    const dietMatches = diet === 'all' || item.diet === diet;
    const searchable = `${item.name} ${item.description} ${categories.find(([id]) => id === item.category)?.[1] ?? ''}`.toLowerCase();
    return categoryMatches && dietMatches && words.every((word) => searchable.includes(word));
  }).sort((first, second) => Number(isAvailable(second)) - Number(isAvailable(first)));

  function resetFilters() {
    setCategory('all');
    setQuery('');
    setDiet('all');
  }

  return (
    <>
      <header className="topbar">
        <div className="frame bar-inner">
          <a className="brand" href="#top"><img src="/spice.svg" width="42" height="42" alt="" /><span><strong>Spice Garden</strong><small>BY AADISAKTTHI</small></span></a>
          {tableLabel && <span className="table-context">Table {tableLabel}</span>}
        </div>
      </header>

      <main className="frame" id="top">
        <section className="discovery-hero" aria-labelledby="hero-title">
          {heroPhoto && <img className="discovery-hero-photo" src={heroPhoto} alt="" fetchPriority="high" />}
          <div className="hero-copy">
            <p className="eyebrow"><span /> SPICE GARDEN · KOVALAM</p>
            <h1 id="hero-title">{featured?.name ?? 'Spice Garden'}</h1>
            <p className="intro">{featured?.tasting_note || featured?.description || 'Coastal Kerala cooking at Aadisaktthi Resorts & Spa.'}</p>
            {featured && <p className="hero-price">{formatPrice(featured.price_paise)}</p>}
            <div className="discovery-hero-actions">
              {featured && <button className="discovery-action" type="button" onClick={() => openDish(featured)}>
                Explore dish <Icon name="right" size={16} />
              </button>}
              <a className="menu-jump" href="#menu">Browse full menu <Icon name="down" size={15} /></a>
            </div>
          </div>
        </section>

        {picks.length > 0 && <section className="discovery-picks" aria-labelledby="chef-picks-title">
          <p className="eyebrow"><span /> FROM THE KITCHEN</p>
          <h2 id="chef-picks-title">Chef’s Picks</h2>
          <div className="picks-grid">
            {picks.map((item) => {
              const photo = dishMedia(item).images[0];
              return <button key={item.id} className="pick-card" type="button" onClick={() => openDish(item)}
                aria-label={`Explore ${item.name}`}>
                <img src={photo ?? '/images/dish-placeholder.svg'} alt="" width="720" height="480" loading="lazy"
                  onError={photo ? (event) => { if (!event.currentTarget.src.endsWith('/dish-placeholder.svg')) event.currentTarget.src = '/images/dish-placeholder.svg'; } : undefined} />
                <span className="pick-content"><span><strong>{item.name}</strong>
                  <span className="pick-note">{item.tasting_note || item.description}</span></span><Icon name="right" size={19} /></span>
              </button>;
            })}
          </div>
        </section>}

        <section id="menu" aria-label="Restaurant menu">
          <div className="menu-controls">
            <div className="search-row">
              <div className="search-box">
                <Icon name="search" size={21} />
                <input aria-label="Search dishes" type="search" placeholder="Search dishes"
                  value={query} onChange={(event) => { setQuery(event.target.value); setCategory('all'); }} />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={17} /></button>}
              </div>
              <select aria-label="Dietary preference" value={diet} onChange={(event) => setDiet(event.target.value)}>
                <option value="all">All diets</option><option value="veg">Vegetarian</option><option value="non-veg">Non-vegetarian</option>
              </select>
            </div>
            <nav className="categories" aria-label="Menu categories">
              {allCategories.map(([id, label]) => <button key={id} type="button" aria-pressed={category === id}
                onClick={() => setCategory(id)}>{label}</button>)}
            </nav>
          </div>

          {status === 'loading' && <div className="notice" role="status">Loading the menu…</div>}
          {status === 'error' && <div className="notice" role="alert">
            <p>The live menu is temporarily unavailable. Please ask your server for the current menu.</p>
            <button type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>Try again</button>
          </div>}
          {status === 'ready' && <>
            <div className="results-title"><h2>{words.length ? 'Search results' : category === 'all' ? 'The Menu' : sectionName}</h2>
              <span role="status">{results.length} {results.length === 1 ? 'dish' : 'dishes'}</span></div>
            {results.length > 0 ? <div className="dishes">
              {results.map((item, index) => <DishCard key={item.id} item={item} index={index}
                onOpen={() => openDish(item)} />)}
            </div> : <div className="notice">
              <p>{category === 'special' && !words.length && diet === 'all' ? 'Ask your server about today’s specials.' :
                hasFilters ? 'No dishes match your filters.' : 'Please ask your server for the current menu.'}</p>
              {hasFilters && <button type="button" onClick={resetFilters}>See all dishes</button>}
            </div>}
          </>}
        </section>
      </main>

      <footer><div className="frame footer-inner">
        <div><strong>Spice Garden Restaurant</strong><p>Aadisaktthi Resorts &amp; Spa · Vellar, Kovalam</p></div>
        <p>{liveMenuEnabled ? 'Please ask your server about allergens and availability.' : 'Presentation menu · Sample prices and illustrative photography'}</p>
      </div></footer>

      {selectedDish && <DishDialog key={selectedDish.id} item={selectedDish} date={date}
        preview={!liveMenuEnabled} pairing={pairing} onOpenPairing={() => openDish(pairing)}
        onDismiss={() => setSelectedId(null)} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
