export function PacksPage() {
  return (
    <section className="panel">
      <h2>Packs</h2>
      <p>Create sellable quiz bundles (Animals, Science, etc.) and assign Stripe price IDs.</p>
      <div className="grid">
        <input placeholder="Pack title" />
        <textarea placeholder="Pack description" rows={4} />
        <div className="grid grid-2">
          <input placeholder="Slug (animals-pack)" />
          <input placeholder="Stripe price ID (price_...)" />
        </div>
        <button type="button">Save Pack</button>
      </div>
    </section>
  )
}
