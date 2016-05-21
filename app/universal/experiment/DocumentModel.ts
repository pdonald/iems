import GroupModel from './GroupModel'

interface DocumentProps {
  name: string
  created: string
  updated: string
}

export default class DocumentModel {
  public id: string
  public graph: GroupModel
  public props: DocumentProps
  public tags: { [name: string]: any }
  public vars: { [name: string]: any }
  public status: { [id: string]: string }
  public stack: GroupModel[]
}