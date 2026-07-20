export default function ResponsiveStyles() {
  return (
    <style>{`
@media (min-width: 768px) {
  .aw-hero { padding: 24px !important; }
  .aw-hero-cover { width: 96px !important; height: 132px !important; }
}
@media (min-width: 1024px) {
  .aw-shelf-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important; gap: 18px !important; }
}
`}</style>
  )
}
