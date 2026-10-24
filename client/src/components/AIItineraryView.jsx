import React, { useState } from 'react';
import { 
  Sparkles, Calendar, MapPin, DollarSign, Users, Compass, 
  Hotel, Plus, Trash2, Printer, Save, CheckCircle, AlertTriangle, 
  ArrowRight, RefreshCw, Send, Check
} from 'lucide-react';
import { formatINR, formatDate, calculateEndDate } from '../utils/formatters';

export default function AIItineraryView({ onOpenNewBooking, onNavigate }) {
  // Generator Inputs
  const [destination, setDestination] = useState('Himachal Pradesh (Manali & Shimla)');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState(5);
  const [paxCount, setPaxCount] = useState(2);
  const [budget, setBudget] = useState(55000);
  const [currency, setCurrency] = useState('INR');
  const [travelStyle, setTravelStyle] = useState('Comfort / Family');
  const [interests, setInterests] = useState('Snow views, Scenic valleys, Temples, Local Food');
  const [hotelCategory, setHotelCategory] = useState('4-Star');
  const [specialRequests, setSpecialRequests] = useState('Vegetarian meals, private cab with experienced hill driver.');

  // Generated Itinerary State
  const [generating, setGenerating] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isSavedAsPackage, setIsSavedAsPackage] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setIsSavedAsPackage(false);

      const res = await fetch('/api/ai/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          startDate,
          durationDays,
          paxCount,
          budget,
          currency,
          travelStyle,
          interests,
          hotelCategory,
          specialRequests
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedItinerary(data);
      } else {
        alert('Failed to generate AI itinerary');
      }
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDayChange = (index, field, value) => {
    if (!generatedItinerary) return;
    const updatedDays = [...generatedItinerary.days];
    updatedDays[index][field] = value;
    setGeneratedItinerary({
      ...generatedItinerary,
      days: updatedDays
    });
  };

  const handleAddDay = () => {
    if (!generatedItinerary) return;
    const newDayNum = generatedItinerary.days.length + 1;
    const newDays = [
      ...generatedItinerary.days,
      {
        day: newDayNum,
        title: `Extended Sightseeing in ${destination}`,
        morningActivity: 'Morning nature walk & local sightseeing.',
        afternoonActivity: 'Visit popular handicraft markets & viewpoints.',
        eveningActivity: 'Sunset viewpoint followed by dinner at hotel.',
        stayHotel: generatedItinerary.hotelRecommendation || 'Standard Resort',
        mealsIncluded: 'Breakfast, Dinner',
        travelTime: '1 - 2 hours transfer',
        estimatedDayCost: 6500
      }
    ];

    setGeneratedItinerary({
      ...generatedItinerary,
      durationDays: newDayNum,
      durationNights: newDayNum - 1,
      days: newDays
    });
  };

  const handleRemoveDay = (index) => {
    if (!generatedItinerary || generatedItinerary.days.length <= 1) return;
    const newDays = generatedItinerary.days.filter((_, i) => i !== index).map((d, i) => ({
      ...d,
      day: i + 1
    }));

    setGeneratedItinerary({
      ...generatedItinerary,
      durationDays: newDays.length,
      durationNights: Math.max(1, newDays.length - 1),
      days: newDays
    });
  };

  const handleSaveToPackageMaster = async () => {
    if (!generatedItinerary) return;
    try {
      const payload = {
        name: generatedItinerary.packageName,
        destination: generatedItinerary.destination,
        country: 'India',
        description: generatedItinerary.summary,
        durationDays: generatedItinerary.durationDays,
        durationNights: generatedItinerary.durationNights,
        sellingPrice: generatedItinerary.estimatedSellingPrice,
        estimatedCost: generatedItinerary.estimatedSupplierCost,
        pricingBasis: 'Per Couple (Twin Sharing)',
        inclusions: generatedItinerary.inclusions?.join('\n') || '',
        exclusions: generatedItinerary.exclusions?.join('\n') || '',
        cancellationTerms: generatedItinerary.cancellationTerms?.join('\n') || '',
        dayWiseItinerary: generatedItinerary.days.map(d => ({
          day: d.day,
          title: d.title,
          morning_activity: d.morningActivity,
          afternoon_activity: d.afternoonActivity,
          evening_activity: d.eveningActivity,
          stay_hotel: d.stayHotel,
          meals_included: d.mealsIncluded
        })),
        imageUrl: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=800'
      };

      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsSavedAsPackage(true);
        alert('Itinerary saved as reusable Package Master record!');
      }
    } catch (err) {
      console.error('Error saving package:', err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="#2563eb" /> AI Itinerary Builder &amp; Proposal Designer
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Input destination, style &amp; budget to generate full day-by-day itineraries with estimated hotel rates and inclusions.
          </p>
        </div>

        {generatedItinerary && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-outline"
              onClick={() => window.print()}
            >
              <Printer size={16} /> Print Branded Proposal
            </button>

            <button 
              className={`btn ${isSavedAsPackage ? 'btn-success' : 'btn-primary'}`}
              onClick={handleSaveToPackageMaster}
            >
              {isSavedAsPackage ? <Check size={16} /> : <Save size={16} />}
              {isSavedAsPackage ? 'Saved to Packages!' : 'Save as Reusable Package'}
            </button>
          </div>
        )}
      </div>

      {/* Generator Input Panel */}
      <div className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <form onSubmit={handleGenerate}>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Destination (India or International) *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Kashmir Valley, Kerala, Dubai, Thailand, Rajasthan, Goa"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Travel Start Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration (Days)</label>
              <input 
                type="number" 
                className="form-input" 
                min="2" 
                max="21"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Travelers (Pax)</label>
              <input 
                type="number" 
                className="form-input" 
                min="1" 
                max="50"
                value={paxCount}
                onChange={(e) => setPaxCount(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Budget (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Travel Style</label>
              <select 
                className="form-select"
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
              >
                <option value="Comfort / Family">Comfort / Family</option>
                <option value="Honeymoon / Romantic">Honeymoon / Romantic</option>
                <option value="Luxury Heritage">Luxury Heritage</option>
                <option value="Adventure & Hills">Adventure &amp; Hills</option>
                <option value="Budget Explorer">Budget Explorer</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hotel Category</label>
              <select 
                className="form-select"
                value={hotelCategory}
                onChange={(e) => setHotelCategory(e.target.value)}
              >
                <option value="4-Star">4-Star Premium</option>
                <option value="5-Star Luxury">5-Star Luxury / Heritage</option>
                <option value="3-Star Comfort">3-Star Comfort</option>
                <option value="Houseboat / Eco-Resort">Houseboat / Eco-Resort</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Traveler Interests</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Snow, Shrines, Spices, Backwaters, Forts, Wildlife"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Special Requests</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Jain pure vegetarian food, private Innova cab"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={generating}
              style={{ padding: '12px 24px', fontSize: '15px' }}
            >
              <Sparkles size={18} /> {generating ? 'Generating Itinerary with AI...' : 'Generate Itinerary with AI'}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Itinerary Display */}
      {generatedItinerary && (
        <div>
          {/* Unverified Estimate Notice Alert */}
          <div style={{ 
            background: '#fffbeb', 
            border: '1px solid #fde68a', 
            padding: '14px 18px', 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={20} color="#b45309" />
            <div style={{ fontSize: '12.5px', color: '#92400e', lineHeight: 1.4 }}>
              <strong>Unverified AI Estimates:</strong> {generatedItinerary.isEstimateNotice}
              <div style={{ fontSize: '11px', color: '#b45309' }}>Engine: {generatedItinerary.aiSource}</div>
            </div>
          </div>

          {/* Proposal Header Card */}
          <div className="panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="badge badge-confirmed" style={{ marginBottom: '8px' }}>
                  {generatedItinerary.destination} • {generatedItinerary.durationDays} Days / {generatedItinerary.durationNights} Nights
                </span>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                  {generatedItinerary.packageName}
                </h3>
                <p style={{ color: '#475569', fontSize: '14px', maxWidth: '700px', marginTop: '6px', lineHeight: 1.6 }}>
                  {generatedItinerary.summary}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Estimated Quote</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e3a8a' }}>
                  {formatINR(generatedItinerary.estimatedSellingPrice)}
                </div>
                <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                  Est. Supplier Cost: {formatINR(generatedItinerary.estimatedSupplierCost)}
                </div>
              </div>
            </div>
          </div>

          {/* Day-by-Day Interactive Editable Schedule */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Day-by-Day Editable Itinerary
              </h3>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={handleAddDay}
              >
                <Plus size={14} /> Add Day
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {generatedItinerary.days.map((day, idx) => (
                <div 
                  key={idx} 
                  className="panel" 
                  style={{ margin: 0, padding: '20px', borderLeft: '4px solid #1e3a8a' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        background: '#1e3a8a', 
                        color: 'white', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontWeight: 800, 
                        fontSize: '13px' 
                      }}>
                        Day {day.day}
                      </span>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', width: '380px' }}
                        value={day.title}
                        onChange={(e) => handleDayChange(idx, 'title', e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Est. Cost: ₹{day.estimatedDayCost}
                      </span>
                      {generatedItinerary.days.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveDay(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                          title="Remove this day"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Morning, Afternoon, Evening Activity fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>
                        🌅 Morning Activity &amp; Sightseeing
                      </label>
                      <textarea 
                        className="form-textarea" 
                        rows={2} 
                        style={{ fontSize: '13px' }}
                        value={day.morningActivity}
                        onChange={(e) => handleDayChange(idx, 'morningActivity', e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', display: 'block', marginBottom: '4px' }}>
                        ☀️ Afternoon Highlights &amp; Attractions
                      </label>
                      <textarea 
                        className="form-textarea" 
                        rows={2} 
                        style={{ fontSize: '13px' }}
                        value={day.afternoonActivity}
                        onChange={(e) => handleDayChange(idx, 'afternoonActivity', e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        🌙 Evening Leisure &amp; Dinner
                      </label>
                      <textarea 
                        className="form-textarea" 
                        rows={2} 
                        style={{ fontSize: '13px' }}
                        value={day.eveningActivity}
                        onChange={(e) => handleDayChange(idx, 'eveningActivity', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <strong>Hotel Stay:</strong> {day.stayHotel} | <strong>Meals:</strong> {day.mealsIncluded}
                    </div>
                    <div>
                      <strong>Transfer Time:</strong> {day.travelTime || '1 - 2 hours'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inclusions & Exclusions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="panel" style={{ margin: 0, padding: '20px' }}>
              <h4 style={{ fontWeight: 800, fontSize: '15px', color: '#166534', marginBottom: '10px' }}>
                Included in Proposal
              </h4>
              <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#14532d', lineHeight: 1.8 }}>
                {generatedItinerary.inclusions?.map((inc, i) => (
                  <li key={i}>{inc}</li>
                ))}
              </ul>
            </div>

            <div className="panel" style={{ margin: 0, padding: '20px' }}>
              <h4 style={{ fontWeight: 800, fontSize: '15px', color: '#991b1b', marginBottom: '10px' }}>
                Exclusions &amp; Extras
              </h4>
              <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#7f1d1d', lineHeight: 1.8 }}>
                {generatedItinerary.exclusions?.map((exc, i) => (
                  <li key={i}>{exc}</li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
