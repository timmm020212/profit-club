export default function Footer() {
  return (
    <footer className="bg-bg-dark py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="text-text-primary">
          © {new Date().getFullYear()} Profit Club. Все права защищены.
        </p>
      </div>
    </footer>
  );
}

