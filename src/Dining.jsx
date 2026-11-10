import React, { useEffect, useRef, useState } from 'react';
import { categories, dishMedia, formatPrice, isAvailable, isSpecial } from './menu.js';
import { Icon } from './Icon.jsx';

function DishMeta({ item, date }) {
  const label = categories.find(([id]) => id === item.category)?.[1] ?? 'Dish';
  return (
    <p className="dish-category">
      {item.diet !== 'unknown' && <span className={`diet-dot ${item.diet}`} role="img"
        aria-label={item.diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} />}
      {label}
      {isSpecial(item, date) && <span className="special-tag">Today’s special</span>}
    </p>
  );
}

export function DishCard({ item, index, onOpen }) {
  const { images } = dishMedia(item);
  const [badImage, setBadImage] = useState(null);
  const photo = images[0] !== badImage ? images[0] : null;
  const available = isAvailable(item);
  return (
    <article className="dish-card">
      <div className="dish-visual">
        <img src={photo ?? '/images/dish-placeholder.svg'} alt={photo ? item.name : ''} width="720" height="480"
          loading={index < 3 ? 'eager' : 'lazy'} decoding="async" onError={photo ? () => setBadImage(photo) : undefined} />
      </div>
      <div className="dish-content">
        <div>
          <div className="dish-heading">
            {item.diet !== 'unknown' && <span className={`diet-dot ${item.diet}`} role="img"
              aria-label={item.diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} />}
            <h3>{item.name}</h3>
          </div>
          <p className="dish-description">{item.description || 'Ask your server about this dish.'}</p>
        </div>
        <p className="dish-price">{formatPrice(item.price_paise)}</p>
      </div>
      <div className="dish-bottom">
        {!available && <span className="dish-unavailable">Unavailable</span>}
        <button className="details-button" type="button" onClick={onOpen} aria-label={`View dish: ${item.name}`}>
          View dish <Icon name="right" size={15} />
        </button>
        
      </div>
    </article>
  );
}

function Modal({ titleId, className, onDismiss, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const modal = ref.current;
    const opener = document.activeElement;
    modal.showModal();
    return () => {
      modal.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={ref} className={`dining-modal ${className}`} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}>
      <div className="modal-surface">
        <button className="modal-close" type="button" onClick={onDismiss} aria-label="Close dialog"><Icon name="close" size={20} /></button>
        {children}
      </div>
    </dialog>
  );
}

function Gallery({ images, video, name, preview }) {
  const [index, setIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(images.length === 0 && Boolean(video));
  const [badImages, setBadImages] = useState([]);
  const [videoError, setVideoError] = useState(false);
  const touchStart = useRef(null);

  function step(direction) {
    setIndex((previous) => (previous + direction + images.length) % images.length);
  }

  return (
    <div className="gallery">
      {video && images.length > 0 && <div className="gallery-switch" aria-label="Dish media">
        <button type="button" aria-pressed={!showVideo} onClick={() => setShowVideo(false)}><Icon name="camera" size={16} /> Photos</button>
        <button type="button" aria-pressed={showVideo} onClick={() => setShowVideo(true)}><Icon name="video" size={15} /> Video</button>
      </div>}
      {showVideo ? (
        <div className="gallery-stage">
          {videoError ? <p className="media-unavailable">This video is unavailable right now.</p> :
            <video src={video} poster={images[0]} controls playsInline preload="none" aria-label={`${name} video`}
              onError={() => setVideoError(true)} />}
        </div>
      ) : (
        <div className="gallery-stage" onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }} onTouchEnd={(event) => {
          if (!touchStart.current || images.length < 2) return;
          const touch = event.changedTouches[0];
          const dx = touch.clientX - touchStart.current.x;
          const dy = touch.clientY - touchStart.current.y;
          touchStart.current = null;
          if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
        }} onTouchCancel={() => { touchStart.current = null; }}>
          {badImages.includes(images[index]) ? <p className="media-unavailable">This photo is unavailable right now.</p> :
            <img key={images[index]} src={images[index]} alt={`${name} · photo ${index + 1}`}
              onError={() => setBadImages((previous) => [...previous, images[index]])} />}
          {images.length > 1 && <>
            <button className="gallery-arrow prev" type="button" onClick={() => step(-1)} aria-label="Previous photo"><Icon name="left" /></button>
            <button className="gallery-arrow next" type="button" onClick={() => step(1)} aria-label="Next photo"><Icon name="right" /></button>
            <span className="gallery-counter" aria-live="polite">Photo {index + 1} / {images.length}</span>
          </>}
        </div>
      )}
      <div className="gallery-caption">
        {preview && images.length > 0 && <small>Illustrative photography</small>}
        {!showVideo && images.length > 1 && <div className="gallery-dots">
          {images.map((src, photo) => <button key={src} type="button" onClick={() => setIndex(photo)}
            aria-label={`Show photo ${photo + 1}`} aria-pressed={photo === index} />)}
        </div>}
      </div>
    </div>
  );
}

export function DishDialog({ item, date, preview, pairing, onOpenPairing, onDismiss }) {
  const { images, video } = dishMedia(item);
  return (
    <Modal titleId="dish-title" className="dish-modal" onDismiss={onDismiss}>
      <div className="dish-intro">
        <DishMeta item={item} date={date} />
        <h2 id="dish-title">{item.name}</h2>
        <p className="dish-detail-price">{formatPrice(item.price_paise)}{!isAvailable(item) && <span>Currently unavailable</span>}</p>
      </div>
      {(images.length > 0 || video) && <Gallery images={images} video={video} name={item.name} preview={preview} />}
      <div className="dish-story">
        <p>{item.description || 'Your server can tell you more about this dish.'}</p>
        {pairing && <aside className="dish-pairing">
          <h3>Try it with</h3>
          <button type="button" className="details-button" onClick={onOpenPairing}>
            {pairing.name} <Icon name="right" size={15} />
          </button>
          <p>{item.pairing.note}</p>
        </aside>}
        <small>Please ask your server about allergens, spice level, and portion size.</small>
      </div>
    </Modal>
  );
}
