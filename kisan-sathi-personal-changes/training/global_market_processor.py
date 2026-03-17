"""
Global Market Analysis - Process FAOSTAT export data
This script processes FAOSTAT commodity trade data for global market insights
"""

import pandas as pd
import numpy as np
from pathlib import Path

class GlobalMarketProcessor:
    def __init__(self, csv_path):
        """Initialize processor with FAOSTAT CSV file"""
        self.df = pd.read_csv(csv_path)
        self.process_data()
    
    def process_data(self):
        """Clean and process raw FAOSTAT data"""
        # Replace empty values with 0
        self.df['Value'] = pd.to_numeric(self.df['Value'], errors='coerce').fillna(0)
        
        # Filter for export data only and official/reliable figures
        self.df = self.df[self.df['Element'].str.contains('Export', case=False, na=False)]
        self.df = self.df[self.df['Flag'].isin(['A', 'T', 'E', ''])]  # Official figures
    
    def get_countries(self):
        """Get list of all countries in dataset"""
        return sorted(self.df['Area'].unique().tolist())
    
    def get_commodities(self):
        """Get list of all commodities"""
        return sorted(self.df['Item'].unique().tolist())
    
    def get_export_by_country(self, country, element_type='Export quantity'):
        """
        Get export data for a specific country
        
        Args:
            country: Country name
            element_type: 'Export quantity' or 'Export value'
        
        Returns:
            DataFrame with export data
        """
        data = self.df[
            (self.df['Area'] == country) & 
            (self.df['Element'] == element_type)
        ].copy()
        
        if data.empty:
            return pd.DataFrame()
        
        data = data.sort_values('Year', ascending=False)
        return data[['Item', 'Year', 'Value', 'Unit']].reset_index(drop=True)
    
    def get_global_export_demand(self, commodity=None, element_type='Export quantity'):
        """
        Get global export demand - sum of all countries
        
        Args:
            commodity: Specific commodity or None for all
            element_type: 'Export quantity' or 'Export value'
        
        Returns:
            DataFrame with global demand by year
        """
        data = self.df[self.df['Element'] == element_type].copy()
        
        if commodity:
            data = data[data['Item'].str.contains(commodity, case=False, na=False)]
        
        # Group by year and sum
        global_data = data.groupby('Year')['Value'].sum().reset_index()
        global_data = global_data.sort_values('Year', ascending=False)
        
        return global_data
    
    def get_commodity_export_trend(self, commodity, element_type='Export quantity'):
        """
        Get export trend for a specific commodity across all countries
        
        Args:
            commodity: Commodity name
            element_type: 'Export quantity' or 'Export value'
        
        Returns:
            DataFrame with commodity exports by country and year
        """
        data = self.df[
            (self.df['Element'] == element_type) &
            (self.df['Item'].str.contains(commodity, case=False, na=False))
        ].copy()
        
        if data.empty:
            return pd.DataFrame()
        
        # Pivot to get countries as columns
        pivot = data.pivot_table(
            index='Year',
            columns='Area',
            values='Value',
            aggfunc='sum'
        ).fillna(0)
        
        return pivot.sort_index(ascending=False)
    
    def get_top_exporters(self, commodity=None, year=2024, limit=10, element_type='Export quantity'):
        """
        Get top exporting countries
        
        Args:
            commodity: Specific commodity or None for all
            year: Year to filter
            limit: Number of top exporters to return
            element_type: 'Export quantity' or 'Export value'
        
        Returns:
            DataFrame with top exporters
        """
        data = self.df[
            (self.df['Element'] == element_type) &
            (self.df['Year'] == year)
        ].copy()
        
        if commodity:
            data = data[data['Item'].str.contains(commodity, case=False, na=False)]
        
        # Group by country and sum
        top = data.groupby('Area')['Value'].sum().sort_values(ascending=False).head(limit)
        
        result = pd.DataFrame({
            'Country': top.index,
            'Value': top.values,
            'Year': year,
            'Element': element_type
        }).reset_index(drop=True)
        
        return result
    
    def get_country_commodity_exports(self, country, year=None, element_type='Export quantity'):
        """
        Get top commodities exported by a country
        
        Args:
            country: Country name
            year: Specific year or None for all years
            element_type: 'Export quantity' or 'Export value'
        
        Returns:
            DataFrame with commodities and values
        """
        data = self.df[
            (self.df['Area'] == country) &
            (self.df['Element'] == element_type)
        ].copy()
        
        if year:
            data = data[data['Year'] == year]
        
        # Group by commodity
        grouped = data.groupby('Item')['Value'].sum().sort_values(ascending=False)
        
        result = pd.DataFrame({
            'Commodity': grouped.index,
            'Value': grouped.values
        }).reset_index(drop=True)
        
        return result
    
    def get_demand_forecast(self, commodity, country=None):
        """
        Simple linear regression forecast for next year
        
        Args:
            commodity: Commodity name
            country: Specific country or None for global
        
        Returns:
            Dictionary with forecast data
        """
        if country:
            data = self.df[
                (self.df['Area'] == country) &
                (self.df['Item'].str.contains(commodity, case=False, na=False)) &
                (self.df['Element'] == 'Export quantity')
            ].copy()
        else:
            data = self.df[
                (self.df['Item'].str.contains(commodity, case=False, na=False)) &
                (self.df['Element'] == 'Export quantity')
            ].groupby('Year')['Value'].sum().reset_index()
            data.columns = ['Year', 'Value']
        
        if data.empty or len(data) < 2:
            return {'forecast': None, 'confidence': 'low'}
        
        # Simple trend
        years = data['Year'].values
        values = data['Value'].values
        
        # Linear fit
        coeffs = np.polyfit(years, values, 1)
        slope = coeffs[0]
        
        # Forecast for next year
        next_year = max(years) + 1
        forecast = coeffs[0] * next_year + coeffs[1]
        
        # Determine trend
        trend = 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable'
        confidence = 'high' if abs(slope) > (values.std() * 0.1) else 'medium' if abs(slope) > 0 else 'low'
        
        return {
            'forecast': max(forecast, 0),
            'trend': trend,
            'slope': slope,
            'confidence': confidence,
            'next_year': int(next_year)
        }


def load_global_market_data():
    """Load and cache global market data"""
    csv_path = Path(__file__).parent.parent / 'data' / 'processed' / 'FAOSTAT_data_en_2-22-2026 (added countries).csv'
    
    if not csv_path.exists():
        raise FileNotFoundError(f"FAOSTAT data file not found: {csv_path}")
    
    return GlobalMarketProcessor(str(csv_path))


if __name__ == "__main__":
    processor = load_global_market_data()
    
    print("=== Global Market Analysis ===")
    print(f"Countries: {len(processor.get_countries())}")
    print(f"Commodities: {len(processor.get_commodities())}")
    print(f"\nTop 5 countries by export quantity (2024):")
    top = processor.get_top_exporters(year=2024, limit=5)
    print(top.to_string(index=False))
    print(f"\nGlobal export demand trend:")
    trend = processor.get_global_export_demand()
    print(trend.to_string(index=False))
