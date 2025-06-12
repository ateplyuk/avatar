import React, { useState, useEffect, useRef } from 'react';
import { startFinetune, getFinetuneResult } from '../services/api';
import { DEFAULT_FINETUNE_IMAGE_URL } from '../config';

const POLL_INTERVAL = 5000; // 5 секунд
const POLL_TIMEOUT = 5 * 60 * 1000; // 5 минут

const Step0Finetune = () => {
  const [form, setForm] = useState({
    data_url: DEFAULT_FINETUNE_IMAGE_URL,
    finetune_comment: '',
    mode: 'character',
    trigger_word: 'TOM4S',
    iterations: 300,
    priority: 'quality',
    captioning: true,
    lora_rank: 32,
    finetune_type: 'full',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);
  const [requestBody, setRequestBody] = useState(null);
  const [result, setResult] = useState(null);
  const [polling, setPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState('');
  const pollTimeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // Очистка polling при размонтировании
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const pollForFinetuneId = (requestId) => {
    setPolling(true);
    setPollStatus('Waiting for fine-tune to complete...');
    let startTime = Date.now();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getFinetuneResult(requestId);
        if (res && res.finetune_id) {
          setResult({
            message: 'Fine-tune completed!',
            finetune_id: res.finetune_id
          });
          setPollStatus('');
          setPolling(false);
          clearInterval(pollIntervalRef.current);
          clearTimeout(pollTimeoutRef.current);
        }
      } catch (err) {
        // Если ошибка 404 — значит ещё не готово, продолжаем polling
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
        setPollStatus('Timeout: Fine-tune did not complete in 5 minutes.');
        setPolling(false);
        clearInterval(pollIntervalRef.current);
        clearTimeout(pollTimeoutRef.current);
      }
    }, POLL_INTERVAL);
    pollTimeoutRef.current = setTimeout(() => {
      setPollStatus('Timeout: Fine-tune did not complete in 5 minutes.');
      setPolling(false);
      clearInterval(pollIntervalRef.current);
    }, POLL_TIMEOUT);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResponse(null);
    setRequestBody(form);
    setResult(null);
    setPolling(false);
    setPollStatus('');
    try {
      const req = { ...form };
      if (!req.finetune_comment) delete req.finetune_comment;
      const res = await startFinetune(req);
      setResponse({ request_id: res.finetune_id });
      setResult({
        message: 'Fine-tune started. Waiting for completion...'
      });
      pollForFinetuneId(res.finetune_id);
    } catch (err) {
      setError(err.detail || err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 0: Fine-tune (FLUX.1 Pro Trainer)</h2>
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>POST /api/v1/finetune</div>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Training Data URL (S3, zip):</label>
            <input
              type="text"
              name="data_url"
              value={form.data_url}
              onChange={handleChange}
              required
              style={{width: '100%'}}
            />
          </div>
          <div>
            <label>Finetune Comment:</label>
            <input
              type="text"
              name="finetune_comment"
              value={form.finetune_comment}
              onChange={handleChange}
              placeholder="Optional"
            />
          </div>
          <div>
            <label>Mode:</label>
            <select name="mode" value={form.mode} onChange={handleChange}>
              <option value="character">character</option>
              <option value="product">product</option>
              <option value="style">style</option>
              <option value="general">general</option>
            </select>
          </div>
          <div>
            <label>Trigger Word:</label>
            <input
              type="text"
              name="trigger_word"
              value={form.trigger_word}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Iterations:</label>
            <input
              type="number"
              name="iterations"
              value={form.iterations}
              onChange={handleChange}
              min={1}
              max={10000}
            />
          </div>
          <div>
            <label>Priority:</label>
            <select name="priority" value={form.priority} onChange={handleChange}>
              <option value="quality">quality</option>
              <option value="speed">speed</option>
              <option value="high_res_only">high_res_only</option>
            </select>
          </div>
          <div>
            <label>Captioning:</label>
            <input
              type="checkbox"
              name="captioning"
              checked={form.captioning}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>LoRA Rank:</label>
            <input
              type="number"
              name="lora_rank"
              value={form.lora_rank}
              onChange={handleChange}
              min={16}
              max={32}
            />
          </div>
          <div>
            <label>Finetune Type:</label>
            <select name="finetune_type" value={form.finetune_type} onChange={handleChange}>
              <option value="full">full</option>
              <option value="lora">lora</option>
            </select>
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Starting...' : 'Start Fine-tune'}
          </button>
        </form>
        {error && <div className="error-message">Error: {error}</div>}
        {requestBody && (
          <div className="debug-section">
            <h3>Request Body:</h3>
            <pre>{JSON.stringify(requestBody, null, 2)}</pre>
          </div>
        )}
        {response && (
          <div className="debug-section">
            <h3>Response:</h3>
            <pre>{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}
        {result && (
          <div className="debug-section">
            <h3>Result:</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
            {polling && <div style={{color: '#1976d2', marginTop: 8}}>{pollStatus}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step0Finetune; 