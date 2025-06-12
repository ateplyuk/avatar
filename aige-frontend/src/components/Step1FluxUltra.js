import React, { useState, useEffect, useRef } from 'react';
import { generateFluxUltra, getFluxUltraResult } from '../services/api';

const FLUX_ULTRA_ASPECT_RATIOS = [
  { label: '21:9', value: '21:9' },
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '3:2', value: '3:2' },
  { label: '1:1', value: '1:1' },
  { label: '2:3', value: '2:3' },
  { label: '3:4', value: '3:4' },
  { label: '9:16', value: '9:16' },
  { label: '9:21', value: '9:21' }
];

const OUTPUT_FORMATS = [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' }
];
const SAFETY_TOLERANCES = [
  { label: '1 (most strict)', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6 (most permissive)', value: '6' }
];

const POLL_INTERVAL = 5000;
const POLL_TIMEOUT = 5 * 60 * 1000;

const Step1FluxUltra = () => {
  const [form, setForm] = useState({
    prompt: '',
    finetune_id: '',
    aspect_ratio: FLUX_ULTRA_ASPECT_RATIOS[0].value,
    output_format: 'jpeg',
    num_images: 1,
    safety_tolerance: '2',
    seed: '',
    finetune_strength: 0.5
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestBody, setRequestBody] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [polling, setPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState('');
  const [result, setResult] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const pollTimeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' || name === 'finetune_strength' ? Number(value) : value
    }));
  };

  const pollForResult = (reqId) => {
    setPolling(true);
    setPollStatus('Waiting for generation to complete...');
    let startTime = Date.now();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getFluxUltraResult(reqId);
        if (res && res.images && res.images[0] && res.images[0].url) {
          setResult(res);
          setImageUrl(res.images[0].url);
          setPollStatus('');
          setPolling(false);
          clearInterval(pollIntervalRef.current);
          clearTimeout(pollTimeoutRef.current);
        }
      } catch (err) {
        if (err && err.status === 404) {
          setPollStatus('Still processing...');
        } else {
          setPollStatus('Error fetching result: ' + (err.detail || err.message));
          setPolling(false);
          clearInterval(pollIntervalRef.current);
          clearTimeout(pollTimeoutRef.current);
        }
      }
      if (Date.now() - startTime > POLL_TIMEOUT) {
        setPollStatus('Timeout: Generation did not complete in 5 minutes.');
        setPolling(false);
        clearInterval(pollIntervalRef.current);
        clearTimeout(pollTimeoutRef.current);
      }
    }, POLL_INTERVAL);
    pollTimeoutRef.current = setTimeout(() => {
      setPollStatus('Timeout: Generation did not complete in 5 minutes.');
      setPolling(false);
      clearInterval(pollIntervalRef.current);
    }, POLL_TIMEOUT);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setRequestBody(form);
    setRequestId(null);
    setResult(null);
    setImageUrl('');
    setPolling(false);
    setPollStatus('');
    try {
      const req = { ...form };
      if (req.seed === '') delete req.seed;
      req.num_images = Number(req.num_images) || 1;
      req.finetune_strength = Number(req.finetune_strength);
      const res = await generateFluxUltra(req);
      setRequestId(res.request_id);
      pollForResult(res.request_id);
    } catch (err) {
      setError(err.detail || err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 1: Generate with FLUX Ultra</h2>
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>POST /api/v1/flux-ultra</div>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Prompt:</label>
            <input
              type="text"
              name="prompt"
              value={form.prompt}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Finetune ID:</label>
            <input
              type="text"
              name="finetune_id"
              value={form.finetune_id}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Aspect Ratio:</label>
            <select name="aspect_ratio" value={form.aspect_ratio} onChange={handleChange}>
              {FLUX_ULTRA_ASPECT_RATIOS.map(ar => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Output Format:</label>
            <select name="output_format" value={form.output_format} onChange={handleChange}>
              {OUTPUT_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Num Images:</label>
            <input
              type="number"
              name="num_images"
              value={form.num_images}
              min={1}
              max={4}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Safety Tolerance:</label>
            <select name="safety_tolerance" value={form.safety_tolerance} onChange={handleChange}>
              {SAFETY_TOLERANCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Seed (optional):</label>
            <input
              type="number"
              name="seed"
              value={form.seed}
              onChange={handleChange}
              placeholder="Random if empty"
            />
          </div>
          <div>
            <label>Fine-tune Strength (0.0 - 1.0):</label>
            <input
              type="number"
              name="finetune_strength"
              value={form.finetune_strength}
              min={0}
              max={1}
              step={0.01}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate with FLUX Ultra'}
          </button>
        </form>
        {error && <div className="error-message">Error: {error}</div>}
        {requestBody && (
          <div className="debug-section">
            <h3>Request Body:</h3>
            <pre>{JSON.stringify(requestBody, null, 2)}</pre>
          </div>
        )}
        {requestId && (
          <div className="debug-section">
            <h3>Response:</h3>
            <pre>{JSON.stringify({ request_id: requestId }, null, 2)}</pre>
          </div>
        )}
        {polling && (
          <div className="debug-section">
            <h3>Polling Status:</h3>
            <pre>{pollStatus}</pre>
          </div>
        )}
        {result && (
          <div className="debug-section">
            <h3>Result:</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="image-preview-column">
        <h3>Generated Image Preview</h3>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Generated FLUX Ultra"
            className="result-image"
          />
        ) : (
          <div className="image-placeholder">
            {isLoading || polling ? 'Generating image...' : 'Your generated image will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1FluxUltra; 