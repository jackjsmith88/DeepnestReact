export default function InfoPage() {
  return (
    <div className="info-page" style={{ padding: '20px' }}>
      <h1>About Deepnest</h1>
      <p>Deepnest is an open source nesting application for optimizing material usage.</p>
      
      <h2>How to Use</h2>
      <ol>
        <li>Import SVG files containing your parts</li>
        <li>Mark one part as the "sheet" (the material you're cutting from)</li>
        <li>Set quantities for each part</li>
        <li>Click "Start Nest" to begin optimization</li>
        <li>View and export the results</li>
      </ol>
      
      <h2>React Web Version</h2>
      <p>This is a modernized React + Vite version of the original Electron app.</p>
    </div>
  )
}
