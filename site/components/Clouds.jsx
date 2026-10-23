const SIZES = { far: 360, mid: 520, near: 760, front: 320 };

// One drifting cloud layer: the tile twice in a row, translated by -50% in a loop.
export default function Clouds({ layer, lazy = false }) {
  const src = `/assets/clouds-${layer}.webp`;
  const img = <img src={src} width="2400" height={SIZES[layer]} alt="" loading={lazy ? "lazy" : "eager"} decoding="async" />;
  return (
    <div className={`sky-layer l-${layer}`} aria-hidden="true">
      <div className="strip">
        {img}
        {img}
      </div>
    </div>
  );
}
