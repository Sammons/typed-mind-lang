const { DSLParser } = require('../typed-mind/dist/parser');

const content = `
updateUserList :: () => void
  ~ [UserList]

UserList & "List of users"
`;

const parser = new DSLParser();
const result = parser.parse(content);

const userList = result.entities.get('UserList');
const updateUserList = result.entities.get('updateUserList');

console.log('updateUserList.affects:', updateUserList?.affects);
console.log('UserList.affectedBy:', userList?.affectedBy);
console.log('UserList entity:', JSON.stringify(userList, null, 2));
