const merge = require('../../src/lib/merge');

describe('merge', () => {
  it('should export a function', () => {
    expect(typeof merge).toBe('function');
  });

  it('should merge two objects', () => {
    const obj1 = {
      name: 'test',
      test: false,
    };

    const obj2 = {
      test: true,
    };

    const result = merge(obj1, obj2);

    expect(result.test).toBe(obj2.test);
    expect(result.name).toBe(obj1.name);
  });

  it('should modify the original object', () => {
    const obj1 = {};
    const obj2 = {
      name: 'test',
    };

    merge(obj1, obj2);

    expect(obj1.name).toBe(obj2.name);
  });

  it('should return the result', () => {
    const obj1 = {};
    const obj2 = {
      name: 'test',
    };

    const result = merge(obj1, obj2);

    expect(result).toBe(obj1);
  });

  it('should NOT deeply merge an array', () => {
    const obj1 = {
      arr: ['one'],
    };
    const obj2 = {
      arr: ['two', 'three'],
    };

    const result = merge(obj1, obj2);

    expect(result.arr.length).toBe(obj2.arr.length);
  });

  it('should merge multiple objects', () => {
    const obj1 = {
      name: 'one',
    };

    const obj2 = {
      name: 'two',
    };

    const obj3 = {
      name: 'three',
    };

    const result = merge(obj1, obj2, obj3);

    expect(result.name).toBe(obj3.name);
  });

  it('should ignored undefined values', () => {
    const obj1 = {
      port: 3000,
      name: 'test',
    };

    const obj2 = {
      port: void 0,
    };

    const result = merge(obj1, obj2);

    expect(result.port).toBe(obj1.port);
    expect(result.name).toBe(obj1.name);
  });

  it('should deeply merge two objects', () => {
    const obj1 = {
      name: 'test',
      test: false,
      config: {
        host: 'test.com',
        port: 3000,
        deepConfig: {
          db: 0,
          ssl: false,
        },
        cache: {
          type: 'test',
        },
      },
    };

    const obj2 = {
      test: true,
      config: {
        port: 5000,
        deepConfig: {
          db: 1,
          ssl: true,
        },
        cache: false,
      },
    };

    const result = merge(obj1, obj2);

    expect(result.config.port).toBe(obj2.config.port);
    expect(result.config.host).toBe(obj1.config.host);
    expect(result.config.deepConfig.db).toBe(obj2.config.deepConfig.db);
    expect(result.config.deepConfig.ssl).toBe(obj2.config.deepConfig.ssl);
    expect(result.config.cache).toBe(obj2.config.cache);
  });
});
