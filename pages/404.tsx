import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-6xl font-extrabold text-gray-900">404</h1>
      <p className="mt-4 text-xl text-gray-600">Oops! The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        Go back home
      </Link>
    </div>
  )
}
