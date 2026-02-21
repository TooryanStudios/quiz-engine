export function DashboardPage() {
  return (
    <>
      <section className="panel">
        <h2>Dashboard</h2>
        <p>Overview of quiz inventory, pack sales, and subscriber health.</p>
      </section>
      <section className="panel grid grid-2">
        <div>
          <h3>Total Quizzes</h3>
          <p>Connect Firestore analytics to display count.</p>
        </div>
        <div>
          <h3>Active Subscribers</h3>
          <p>Connect Stripe webhook data for active subscription metrics.</p>
        </div>
      </section>
    </>
  )
}
