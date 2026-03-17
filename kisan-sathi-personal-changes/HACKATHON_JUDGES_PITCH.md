# KISAN - Hackathon Round 1 Judge Pitch

## 1) Problem Statement (30 sec)
Indian farmers often lack easy access to soil testing and data-driven crop guidance. This causes crop mismatch, low yield, and income uncertainty.

## 2) Our Solution (45 sec)
**KISAN** is an AI-powered crop recommendation and decision support platform that suggests suitable crops using:
- Soil nutrients (N, P, K, pH)
- Environmental factors (temperature, humidity, rainfall)
- Location-assisted defaults (state/district based)
- Market insights for better profitability decisions

It also supports **multi-language access** for better inclusivity.

---

## 3) What Makes It Strong
- **Farmer-friendly input modes**
  - Manual mode (for users with soil test reports)
  - Location-based auto-fill mode (for users without lab access)
- **AI recommendation engine**
  - Top crop suggestions with confidence percentages
  - Yield estimate support
- **Market intelligence layer**
  - Crop-level market context to improve real-world decisions
- **Inclusive UX**
  - Language switcher for regional accessibility

---

## 4) Technical Snapshot
- **Frontend:** React
- **Backend:** Flask API
- **ML:** scikit-learn RandomForest models (classification + regression)
- **Data pipeline:** cleaning, feature engineering, model training, model metadata
- **Datasets:** agriculture/crop/rainfall/soil-related processed datasets

---

## 5) Live Demo Script (2-3 min)
1. Open Recommendation page.
2. Choose **Location Mode** and select a state/district.
3. Show auto-filled soil parameters.
4. Enter environmental values (temperature, humidity, rainfall).
5. Click **Get Recommendations**.
6. Show:
   - Primary recommended crop
   - Top alternatives with confidence
   - Estimated yield
7. Switch language once to show accessibility.
8. Open market insight for one recommended crop.

---

## 6) Impact Narrative
- Helps reduce crop-selection guesswork.
- Supports better yield and income planning.
- Lowers entry barrier for farmers without lab access.
- Designed for scalability across regions.

---

## 7) Judge-Focused Value Mapping
### Innovation
Location-based soil auto-fill + AI recommendations + multilingual interface.

### Feasibility
Working end-to-end prototype with real API flow and trained models.

### Usability
Simple UI designed for practical farmer workflow.

### Societal Impact
Potential to improve farm productivity and decision quality at scale.

---

## 8) Expected Judge Questions (Quick Answers)

**Q: How is this different from a generic crop app?**  
A: KISAN combines agronomic parameters, ML confidence scoring, location-based defaults, and market context in one decision flow.

**Q: Is it usable for farmers without technical knowledge?**  
A: Yes. Location mode, guided labels, and language support make it practical for first-time users.

**Q: How do you ensure model relevance?**  
A: We use a structured training pipeline and can continuously retrain with new regional data.

**Q: Can it scale?**  
A: Yes. API-based architecture and modular data/model pipeline support scale-out deployment.

---

## 9) 20-Second Closing
KISAN turns scattered agricultural data into an actionable, farmer-friendly recommendation workflow. It is practical, inclusive, and built for measurable on-ground impact.
