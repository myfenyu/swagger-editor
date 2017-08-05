import Ajv from "ajv"
import { groupBy } from "lodash"
import { transformPathToArray } from "../path-translator.js"
import { uniqueErrors } from "./unique-errors.js"
import jsonSchema from "./jsonSchema"
import { getLineNumberForPath } from "../../ast/ast"

const IGNORED_AJV_PARAMS = ["type"]

export function validate({ jsSpec, specStr, settings = {} }) {
  var ajv = new Ajv({
    allErrors: true,
  })
  ajv.addSchema(jsonSchema)
  settings.schemas.forEach(schema => ajv.addSchema(schema))
  ajv.validate(settings.testSchema || {}, jsSpec)

  if(!ajv.errors || !ajv.errors.length) {
    return null
  }

  console.log(groupBy(ajv.errors, err => err.dataPath.slice(1)))

  const uniquedErrors = uniqueErrors(ajv.errors)

  console.log(uniquedErrors)

  return uniquedErrors.map(err => {
    let preparedMessage = err.message
    if(err.params) {
      preparedMessage += "\n"
      for(var k in err.params) {
        if(IGNORED_AJV_PARAMS.indexOf(k) === -1) {
          preparedMessage += `${k}: ${err.params[k]}\n`
        }
      }
    }
    return {
      level: "error",
      line: getLineNumberForPath(specStr, transformPathToArray(err.dataPath.slice(1), jsSpec) || []),
      path: err.dataPath.slice(1), // slice leading "." from ajv
      message: preparedMessage,
      source: "schema",
      original: err
    }
  })
}
