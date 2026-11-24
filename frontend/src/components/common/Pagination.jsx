import React from 'react';

// Previous / page numbers / Next. Shows at most five page numbers around the
// current page.
const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;

  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav aria-label="Pages" className="d-flex justify-content-center mt-3">
      <ul className="pagination">
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
          <button type="button" className="page-link" onClick={() => onChange(page - 1)} disabled={page === 1}>Previous</button>
        </li>
        {numbers.map((n) => (
          <li key={n} className={`page-item ${n === page ? 'active' : ''}`}>
            <button type="button" className="page-link" onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>
          </li>
        ))}
        <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
          <button type="button" className="page-link" onClick={() => onChange(page + 1)} disabled={page === pages}>Next</button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
