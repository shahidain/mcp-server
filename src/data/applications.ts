const Applications: any = {
  'boss-service': {
    'dev': {
      'name': 'Boss Service',
      'description': 'Development environment for the Boss Service application.',
      'url': 'https://dev.boss-service.example.com',
      'status': 'up',
      'version': '1.0.2',
      'build': '1.0.2+develop:478jk609.90'
    },
    'prod': {
      'name': 'Boss Service',
      'description': 'Production environment for the Boss Service application.',
      'url': 'https://boss-service.example.com',
      'status': 'up',
      'version': '1.0.2',
      'build': '1.0.2+release:478jk609.90'
    },
    'test': {
      'name': 'Boss Service',
      'description': 'Staging environment for the Boss Service application.',
      'url': 'https://staging.boss-service.example.com',
      'status': 'up',
      'version': '1.0.2',
      'build': '1.0.2+release:478jk609.90'
    }
  },
  'transformation-service': {
    'dev': {
      'name': 'Transformation Service',
      'description': 'Development environment for the Transformation Service application.',
      'url': 'https://dev.transformation-service.example.com',
      'status': 'up',
      'version': '1.0.2',
      'build': '1.0.2+develop:478jk609.90'
    },
    'prod': {
      'name': 'Transformation Service',
      'description': 'Production environment for the Transformation Service application.',
      'url': 'https://transformation-service.example.com',
      'status': 'up',
      'version': '1.0.2',
      'build': '1.0.2+release:478jk609.90'
    },
    'test': {
      'name': 'Transformation Service',
      'description': 'Staging environment for the Transformation Service application.',
      'url': 'https://staging.transformation-service.example.com',
      'status': 'up',
      'version': '1.0.2',
      'build': '1.0.2+release:478jk609.90'
    }
  },
  'boss-ui': {
    'dev': {
      'name': 'Boss UI',
      'error': 'Failed to fetch Boss UI application details. Please try again later.'
    }
  }
};

export const getApplication = async (appName: string, env: string) => {
  if (appName === 'boss-ui') {
    try {
      const response = await fetch('https://dreams-core.equitec.in/crm/buildinfo');
      const data = await response.json();
      console.log('Fetched Boss UI data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching Boss UI data:', error);
      return Applications[appName]['dev'];;
    }
  }
  if (Applications[appName] && Applications[appName][env]) {
    return Applications[appName][env];
  }
  return null;
};