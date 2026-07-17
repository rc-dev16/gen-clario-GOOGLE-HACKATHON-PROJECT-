interface ErrorStateProps {
  title?: string;
  message: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  className = ''
}: ErrorStateProps) {
  return (
    <div
      className={`bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-2xl text-center ${className}`}
    >
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-red-600 font-bold text-xl">!</span>
        </div>
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-red-600 font-medium">{message}</p>
    </div>
  );
}
