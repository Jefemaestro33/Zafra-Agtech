export default function EmptyState({ icon, title, description }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      {icon && <span className="text-4xl mb-4 block">{icon}</span>}
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      {description && <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">{description}</p>}
    </div>
  )
}
