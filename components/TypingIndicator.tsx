export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-1 h-4">
      <span 
        className="w-2 h-2 bg-[#828282] rounded-full" 
        style={{ animation: 'typing-bounce 1.4s ease-in-out infinite' }}
      />
      <span 
        className="w-2 h-2 bg-[#828282] rounded-full" 
        style={{ animation: 'typing-bounce 1.4s ease-in-out infinite', animationDelay: '0.2s' }}
      />
      <span 
        className="w-2 h-2 bg-[#828282] rounded-full" 
        style={{ animation: 'typing-bounce 1.4s ease-in-out infinite', animationDelay: '0.4s' }}
      />
    </div>
  );
}
